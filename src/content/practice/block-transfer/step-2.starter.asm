; The count is at 2000H, and that many bytes follow from 2001H.
; Shift the whole block one byte higher: the byte at 2001H moves to 2002H,
; the byte at 2002H moves to 2003H, and so on.
;
; This is your copy from step 1, pointed at a destination that overlaps
; its own source. Run it first and look at what comes out. The body is
; correct and the counter is correct; something else is not.

LXI H, 2000H
MOV C, M
INX H
LXI D, 2002H
LOOP: MOV A, M
STAX D
INX H
INX D
DCR C
JNZ LOOP
HLT
