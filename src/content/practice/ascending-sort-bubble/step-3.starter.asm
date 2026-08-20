; The count is at 2000H, and that many unsigned bytes follow from 2001H.
; Sort them into ascending order, in place.
;
; This is your single pass from step 2. Do not change what it does.
; Wrap it in a second loop that runs it count-1 times, and remember that
; everything the pass consumes has to be set up again at the top of
; every pass.

LXI H, 2000H
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
HLT
