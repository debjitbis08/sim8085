; The count is at 2000H, and that many bytes follow from 2001H.
; Copy them to 3000H onwards.

LXI H, 2000H
MOV C, M
INX H
LXI D, 3000H

; HL points at the first byte to copy, DE at where it should go,
; and C holds the count.
;
; These two instructions are the whole body: they copy ONE byte from
; where HL points to where DE points.

MOV A, M
STAX D

; Make the body run once per byte. Both pointers have to move.

HLT
