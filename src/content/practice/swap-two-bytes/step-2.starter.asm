; One byte is at 2000H, the other at 3000H.
; Exchange them, using HL for one address and DE for the other.

LXI H, 2000H
LXI D, 3000H

; Both pointers are set. Now move the two bytes past each other.

HLT
