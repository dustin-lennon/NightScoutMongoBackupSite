#!/bin/bash
# Wrapper script to start Next.js with bunx
# This ensures bun is in PATH before running

export PATH="$HOME/.bun/bin:$PATH"
if [ -f "/usr/local/bin/bun" ]; then
  export PATH="/usr/local/bin:$PATH"
fi

exec bunx next start

