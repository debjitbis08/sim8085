; A byte is at 2000H. Count how many of its bits are 1
; and store the count at 2001H.

LDA 2000H
MVI C, 00H

; C is the tally. Below is your rotate-and-test from step 1, with the tally
; added to it. It examines exactly ONE bit: the rotation drops a bit into
; the carry flag, and C counts it if it was set.

RRC
JNC SKIP
INR C
SKIP:

; Make the body above run once per bit. How many turns is that,
; and which register counts them down?

MOV A, C
STA 2001H
HLT
