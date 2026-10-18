-- El sitio se presenta como "Guerrero Properties" (aunque Walter sigue
-- afiliado a RE/MAX por dentro, ej. para importar listados de RE/MAX
-- Connect) -- el campo "oficina" del KYC no debía decir "RE/MAX Elite
-- El Salvador".

alter table kyc_solicitudes alter column oficina set default 'Guerrero Properties';

update kyc_solicitudes set oficina = 'Guerrero Properties'
where oficina = 'RE/MAX Elite El Salvador';
