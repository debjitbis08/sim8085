; A multiplicand is at 2000H and a multiplier at 2001H.
; Store the full 16-bit product at 2002H (low) and 2003H (high).
; The multiplier is still at least 1.
;
; This is your program from step 1. The loop is already the right shape:
; the counter, the test and the jump all stay as they are. What has to
; change is where the running total lives and how it is added to.

LDA 2000H
MOV B, A
LDA 2001H
MOV C, A
XRA A
LOOP: ADD B
DCR C
JNZ LOOP
STA 2002H
HLT
