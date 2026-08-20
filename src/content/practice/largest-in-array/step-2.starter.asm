; The count is at 2000H, and that many unsigned bytes follow from 2001H.
; Store the largest of them at 2050H.

LXI H, 2000H
MOV C, M
INX H
MOV B, M

; B now holds the best so far, which is the first element.
;
; Below is your comparison from step 1, rewritten to keep the better of B
; and the byte HL points at. It handles exactly ONE element and then moves
; the pointer on. Your job in this step is not to change it.

MOV A, M
CMP B
JC SKIP
MOV B, A
SKIP: INX H

; Make the body above run once per element, then store the answer.

HLT
