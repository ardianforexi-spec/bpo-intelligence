"""Portable local entrypoint, including Psycopg-compatible Windows event loops."""

import asyncio
import sys

import uvicorn


def selector_loop(use_subprocess: bool = False) -> asyncio.AbstractEventLoop:
    return asyncio.SelectorEventLoop()


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        loop="app.serve:selector_loop" if sys.platform == "win32" else "asyncio",
    )
