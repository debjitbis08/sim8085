; The first number is at 2000H, the second at 2001H.
; Store the difference at 2002H, and at 2003H store 01H if the
; subtraction borrowed, or 00H if it did not.

LDA 2001H
MOV B, A
LDA 2000H
SUB B
STA 2002H

; The carry flag holds the borrow right now. Turn it into a byte at 2003H.

HLT
