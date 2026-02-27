-- Soft-delete mask fields that create white rectangles over the bank header
UPDATE public.vv_b_boleto_template_fields 
SET visible = false
WHERE deleted IS NULL 
AND key IN ('mask_bank_header', 'mask_header_right', 'via2_mask_bank_header', 'via2_mask_header_right');