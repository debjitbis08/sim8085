; The count is at 2000H. The bytes to add follow from 2001H.
; Walk the array without adding anything yet:
;   - point HL at the first byte
;   - use C as the counter
;   - leave HL just past the last byte when the loop ends

HLT
