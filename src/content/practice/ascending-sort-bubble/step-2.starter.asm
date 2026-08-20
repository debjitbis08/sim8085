; The count is at 2000H, and that many unsigned bytes follow from 2001H.
; Make ONE pass over the array: order each adjacent pair from the start.
; Do not add an outer loop yet.
;
; Below is your pair code from step 1. It needs a counter, a label to come
; back to, and one careful decision about where the skip lands.

LXI H, 2001H
MOV A, M
INX H
CMP M
JC DONE
MOV B, M
MOV M, A
DCX H
MOV M, B
DONE: HLT
