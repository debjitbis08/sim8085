; Two bytes sit at 2001H and 2002H.
; If the left one is greater than the right one, swap them.
; Otherwise leave memory exactly as it is.

LXI H, 2001H

HLT
