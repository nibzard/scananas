#!/bin/bash

# Run Amp unattended to implement next task from TODO.md (10 times)
for i in {1..10}; do
    echo "Starting iteration $i/10"
    amp --dangerously-allow-all -x "Read TODO.md and proceed implementing the next task. After you finish implementation update TODO.md and you are done."
    echo "Completed iteration $i/10"
done
