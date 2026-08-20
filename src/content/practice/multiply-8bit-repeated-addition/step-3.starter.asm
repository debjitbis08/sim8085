; A multiplicand is at 2000H and a multiplier at 2001H.
; Store the full 16-bit product at 2002H (low) and 2003H (high).
;
; This is your program from the last step. It is correct for every multiplier
; except one. Run it against the checks, find that input, then fix it.

LDA 2000H
MOV E, A
MVI D, 00H
LDA 2001H
MOV C, A
LXI H, 0000H
LOOP: DAD D
DCR C
JNZ LOOP
SHLD 2002H
HLT
