-- Registro de uso de IA (Claude) para llevar la cuenta del gasto nosotros mismos,
-- en vez de depender de que Anthropic exponga el saldo en vivo.

create table uso_ia (
    id uuid primary key default gen_random_uuid(),
    input_tokens integer not null default 0,
    output_tokens integer not null default 0,
    costo_estimado numeric(10, 6) not null default 0,
    created_at timestamptz not null default now()
);

create index uso_ia_created_at_idx on uso_ia(created_at desc);

alter table uso_ia enable row level security;

-- La función serverless (con la clave pública) registra cada uso.
create policy "anon registra uso de ia" on uso_ia
    for insert to anon with check (true);

-- Solo el panel (logueado) puede leer el contador.
create policy "autenticados leen uso de ia" on uso_ia
    for select to authenticated using (true);
