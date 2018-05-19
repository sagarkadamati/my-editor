#!/bin/bash

CODE_DIR="$1"
if [ "${CODE_DIR}X" == "X" ]; then
	CODE_DIR="/usr/share/code"
fi

grep -B 1000 'src="index.js"' "${CODE_DIR}/resources/app/out/vs/workbench/electron-browser/bootstrap/index.html" > /tmp/index.html
echo '        <link rel="stylesheet" href="/home/sagar/.vscode/extensions/mytheme/css/notabstitle.css"/>' >> /tmp/index.html
echo '</html>'  >> /tmp/index.html

sudo mv /tmp/index.html "${CODE_DIR}/resources/app/out/vs/workbench/electron-browser/bootstrap/index.html"
sudo sed -i 's/+t.NLS_UNSUPPORTED//g' "${CODE_DIR}/resources/app/out/vs/workbench/workbench.main.js"