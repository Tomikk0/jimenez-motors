#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
PID_FILE="$ROOT_DIR/.php_server.pid"
LOG_FILE="${LOG_FILE:-$ROOT_DIR/.php_server.log}"
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-80}"
DOCROOT="${DOCROOT:-$ROOT_DIR}"
PHP_BIN="${PHP_BIN:-php}"

php_command=("$PHP_BIN" -S "$HOST:$PORT" -t "$DOCROOT")

is_running() {
    [[ -f "$PID_FILE" ]] || return 1
    local pid
    pid=$(<"$PID_FILE")
    [[ -n "$pid" && -d "/proc/$pid" ]]
}

start_server() {
    if is_running; then
        echo "A PHP szerver már fut (PID $(<"$PID_FILE"))" >&2
        exit 0
    fi

    echo "PHP szerver indítása a ${HOST}:${PORT} címen…"
    nohup "${php_command[@]}" >"$LOG_FILE" 2>&1 &
    echo $! >"$PID_FILE"
    disown
    echo "Szerver elindítva. Napló: $LOG_FILE"
}

stop_server() {
    if ! is_running; then
        echo "A PHP szerver nem fut." >&2
        exit 0
    fi

    local pid
    pid=$(<"$PID_FILE")
    echo "PHP szerver leállítása (PID $pid)…"
    kill "$pid" || true
    rm -f "$PID_FILE"
    echo "Leállítva."
}

server_status() {
    if is_running; then
        echo "Fut a PHP szerver (PID $(<"$PID_FILE")), napló: $LOG_FILE"
    else
        echo "A PHP szerver nem fut."
    fi
}

show_logs() {
    if [[ ! -f "$LOG_FILE" ]]; then
        echo "Nincs naplófájl ($LOG_FILE)." >&2
        exit 1
    fi
    tail -f "$LOG_FILE"
}

usage() {
    cat <<USAGE
Használat: $(basename "$0") <start|stop|status|logs>
Környezeti változók: HOST, PORT, DOCROOT, PHP_BIN, LOG_FILE
USAGE
}

main() {
    local cmd="${1:-}"
    case "$cmd" in
        start)
            start_server
            ;;
        stop)
            stop_server
            ;;
        status)
            server_status
            ;;
        logs)
            show_logs
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

main "$@"
