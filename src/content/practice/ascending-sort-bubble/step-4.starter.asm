; The count is at 2000H, and that many unsigned bytes follow from 2001H.
; Sort them into ascending order, and stop as soon as the array is in order.
;
; This is your sort from the last step. It always makes count-1 passes.
; Add a record of whether a pass swapped anything, and use it to stop early.

LDA 2000H
DCR A
MOV D, A
PASS: LXI H, 2000H
MOV C, M
DCR C
INX H
LOOP: MOV A, M
INX H
CMP M
JC SKIP
MOV B, M
MOV M, A
DCX H
MOV M, B
INX H
SKIP: DCR C
JNZ LOOP
DCR D
JNZ PASS
HLT
