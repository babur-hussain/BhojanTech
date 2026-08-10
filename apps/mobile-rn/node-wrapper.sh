#!/bin/bash
echo "--- NODE WRAPPER RUN ---" >> /tmp/node-wrapper.log
echo "PWD: $(pwd)" >> /tmp/node-wrapper.log
echo "ARGS: $@" >> /tmp/node-wrapper.log
/usr/local/bin/node "$@" >> /tmp/node-wrapper.log 2>&1
EXIT_CODE=$?
echo "EXIT_CODE: $EXIT_CODE" >> /tmp/node-wrapper.log
exit $EXIT_CODE
