; Two 16-bit numbers, low byte first:
;   the first at 2000H and 2001H
;   the second at 2002H and 2003H
; Store the 16-bit sum at 2004H (low) and 2005H (high).
; Use 8-bit arithmetic: add the low bytes, then the high bytes with the carry.

LXI H, 2000H

HLT
