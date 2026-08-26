#!/usr/bin/env bash
# exit on error
set -o errexit

pip install --no-cache-dir --upgrade pip
pip install --no-cache-dir -r requirements.txt
