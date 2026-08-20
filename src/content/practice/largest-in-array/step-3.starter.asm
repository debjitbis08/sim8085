; The count is at 2000H, and that many unsigned bytes follow from 2001H.
; Store the largest at 2050H and the smallest at 2051H,
; in a single pass over the array.
;
; This is your program from step 2. The loop around the body is already
; right and does not need to change: only the body does, and only by
; answering a second question about each element.

LXI H, 2000H
MOV C, M
INX H
MOV B, M
LOOP: MOV A, M
CMP B
JC SKIP
MOV B, A
SKIP: INX H
DCR C
JNZ LOOP
MOV A, B
STA 2050H
HLT
