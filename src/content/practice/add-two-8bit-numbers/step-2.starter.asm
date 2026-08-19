; The first number is at 2000H, the second at 2001H.
; Add them and store the result at 2002H.

LXI H, 2000H
MOV A, M
INX H
MOV B, M

; Add B to A, then store the answer at 2002H.

HLT
