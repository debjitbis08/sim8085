; The count is at 2000H. The bytes to add follow from 2001H.
; Add them up, leave the total in A, and store it at 2050H.

LXI H, 2000H
MOV C, M
INX H

; Set the running total to zero, then add each byte as you walk the array.

HLT
