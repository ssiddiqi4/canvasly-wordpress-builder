#!/usr/bin/env bash
# Installs WordPress, activates Sidcraft Syntex, and loads the editor screen as an
# admin. Fails on activation errors, PHP fatals/warnings from the plugin, or an
# editor page that does not render the editor root.
#
# Expects: wp (WP-CLI) on PATH and a MySQL server reachable with the DB_* vars.
set -euo pipefail

PLUGIN_SRC="$(cd "$(dirname "$0")/../.." && pwd)"
WP_DIR="${WP_DIR:-/tmp/wordpress}"
WP_VERSION="${WP_VERSION:-latest}"
DB_NAME="${DB_NAME:-wordpress}"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-root}"
DB_HOST="${DB_HOST:-127.0.0.1}"
PORT="${PORT:-8888}"
URL="http://127.0.0.1:${PORT}"
ADMIN_USER=admin
ADMIN_PASS=password
SLUG=sidcraft-syntex

fail() { echo "::error::$*"; exit 1; }

rm -rf "$WP_DIR"
mkdir -p "$WP_DIR"
cd "$WP_DIR"

wp core download --version="$WP_VERSION" --quiet
wp config create --dbname="$DB_NAME" --dbuser="$DB_USER" --dbpass="$DB_PASS" --dbhost="$DB_HOST" --skip-check --quiet
wp config set WP_DEBUG true --raw
wp config set WP_DEBUG_LOG true --raw
wp config set WP_DEBUG_DISPLAY false --raw
wp db create || true
wp core install --url="$URL" --title="Sidcraft Syntex CI" --admin_user="$ADMIN_USER" \
	--admin_password="$ADMIN_PASS" --admin_email=ci@example.com --skip-email --quiet
echo "WordPress $(wp core version)"

# Copy the plugin in the way a release zip would ship it.
mkdir -p "wp-content/plugins/$SLUG"
tar -C "$PLUGIN_SRC" --exclude-from="$PLUGIN_SRC/.distignore" -cf - . | tar -C "wp-content/plugins/$SLUG" -xf -

LOG="wp-content/debug.log"
: > "$LOG"

echo "--- Activating plugin"
wp plugin activate "$SLUG" || fail "Plugin activation failed"
wp plugin is-active "$SLUG" || fail "Plugin is not active after activation"

echo "--- Starting web server"
wp server --host=127.0.0.1 --port="$PORT" > /tmp/wp-server.log 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
for _ in $(seq 1 30); do
	curl -fs -o /dev/null "$URL/wp-login.php" && break
	sleep 1
done

echo "--- Logging in"
JAR=/tmp/wp-cookies.txt
rm -f "$JAR"
curl -fsS -c "$JAR" -o /dev/null "$URL/wp-login.php"
curl -fsS -b "$JAR" -c "$JAR" -o /dev/null \
	--data-urlencode "log=$ADMIN_USER" --data-urlencode "pwd=$ADMIN_PASS" \
	--data-urlencode "redirect_to=$URL/wp-admin/" --data "testcookie=1" \
	"$URL/wp-login.php"
grep -q wordpress_logged_in "$JAR" || fail "Could not log in as admin"

check_page() {
	local name="$1" path="$2" marker="$3" out code
	out="/tmp/smoke-$name.html"
	code=$(curl -sS -b "$JAR" -o "$out" -w '%{http_code}' "$URL$path")
	echo "$name: HTTP $code ($path)"
	[ "$code" = 200 ] || { tail -c 2000 "$out"; fail "$name returned HTTP $code"; }
	if grep -qiE 'critical error|Fatal error' "$out"; then
		grep -iE -m5 'critical error|Fatal error' "$out"
		fail "$name rendered a PHP error"
	fi
	grep -q "$marker" "$out" || { tail -c 2000 "$out"; fail "$name is missing $marker"; }
}

echo "--- Loading admin screens"
check_page dashboard "/wp-admin/" 'id="wpadminbar"'
# sidsyn_iframe=1 asks for the editor itself rather than the iframe shell.
check_page editor "/wp-admin/admin.php?page=$SLUG&post_type=page&new_page=1&sidsyn_iframe=1" 'id="lb-editor"'

echo "--- Checking PHP log"
if grep -E "PHP (Fatal|Parse|Warning)" "$LOG" | grep -q "plugins/$SLUG/"; then
	grep -E "PHP (Fatal|Parse|Warning)" "$LOG" | grep "plugins/$SLUG/" | head -20
	fail "Sidcraft Syntex logged PHP errors or warnings"
fi
if [ -s "$LOG" ]; then
	echo "Other debug.log entries (not failing the build):"
	head -40 "$LOG"
fi

echo "Smoke test passed."
