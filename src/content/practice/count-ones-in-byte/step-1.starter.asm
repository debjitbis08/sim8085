; A byte is at 2000H.
; Store 01H at 2001H if it is odd, 00H if it is even.
; Rotate the byte to get at its lowest bit; do not use ANI.

LDA 2000H

HLT
