-- Fix: adicionar format date_ddmmyyyy nos campos data_vencimento (via1 e via2)
UPDATE vv_b_boleto_template_fields
SET format = 'date_ddmmyyyy', updated_at = now()
WHERE template_id = 'b0000000-0000-0000-0000-000000000001'
  AND key IN ('data_vencimento', 'via2_data_vencimento')
  AND deleted IS NULL;