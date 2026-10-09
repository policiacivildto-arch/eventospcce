# Regras de negócio

## Necessidade de efetivo e vagas

- Cada delegacia lançada tem um período (data inicial e final), o horário de funcionamento e grupos de efetivo (cargo, quantidade, serviço, entrada e saída).
- Entrada igual à saída é turno de 24h. "Último dia até" corta todos os turnos do último dia nesse horário.
- Cada policial de cada grupo, em cada dia, vira **uma vaga**.
- Vagas **não Extra** (ordinário, compensação de horário, extra sem aporte, diária) aparecem na escala assim que a necessidade é salva.
- Vagas **Extra** saem só da versão com **aporte autorizado**, na quantidade autorizada.
- Uma vaga que sai da necessidade mas já tinha alguém escalado fica **inativa** ("fora da necessidade") para o DTO resolver. Sem ninguém escalado, ela é apagada.

## Pagamento (igual ao calcularPagamento)

- Só o serviço **Extra** é pago.
- As horas são arredondadas para cima.
- A hora vai das 06h às 22h pelo valor diurno e das 22h às 06h pelo noturno.
- Sábado, domingo e feriado são pagos inteiros pelo valor noturno.
- Valores por hora: OIP R$ 36,15 (diurno) e R$ 47,00 (noturno); DPC R$ 50,60 e R$ 65,80. Ficam na tabela `valores_hora`.

## Versões

- Uma versão é uma cópia congelada da necessidade de todos os departamentos, com vagas, horas e custo. Depois de fechada, não pode ser alterada.
- Não se fecha uma versão igual à anterior ("Nada mudou").
- Só uma versão por evento pode ter aporte autorizado.

## Escala

- O mesmo servidor não pode estar em duas vagas com horários que se cruzam, nem entre departamentos. O banco bloqueia.
- O cargo do servidor precisa ser o cargo da vaga.
- Com a escala fechada, só o DTO altera.

## Cobertura

- Cada evento tem a sua **abrangência**: a lista de cidades de cada plantonista.
- **A plantonista funciona sempre 24h**, com ou sem pedido de aporte, e cobre também a própria cidade.
- Em cada hora, cada cidade é atendida:
  1. pela delegacia da própria cidade, se ela estiver aberta na necessidade de efetivo;
  2. senão, pela plantonista que tem a cidade na abrangência;
  3. senão, a cidade fica **descoberta**.
- Situação do dia:

| Situação | Quando |
|---|---|
| Delegacia própria | A cidade foi coberta o dia todo pela própria delegacia |
| Própria + plantão | Parte do dia pela própria delegacia, o resto pela plantonista |
| Plantão | O dia todo pela plantonista |
| Descoberta em parte | Delegacia própria só em parte do dia e sem plantonista |
| Sem abrangência | Nenhuma cobertura no dia |

- **Período analisado:** vai do primeiro turno que abre ao último que fecha na necessidade. O DTO pode mudar.
- Se uma delegacia sai da necessidade, a cidade dela passa a ser coberta pela plantonista.
- Uma cidade só pode ter uma plantonista por evento. O focal não pode tirar cidade de plantonista de outro departamento; só o DTO pode.

## Regiões

| Região | Departamentos |
|---|---|
| Capital | COPLAN e DPC |
| Região Metropolitana | DPM |
| Interior Norte | DPI NORTE |
| Interior Sul | DPI SUL |

- Na Cobertura, a região de cada cidade vem do departamento da plantonista dela. Sem plantonista, vem da delegacia da cidade. Sem nenhuma das duas, a cidade fica na região da cidade vizinha mais próxima.
- No Relatório, os demais departamentos (DRCO, DHPP, DPE e outros) aparecem em "Especializadas e outros".

## Acesso

| Papel | O que pode |
|---|---|
| Servidor | Vê só as próprias escalas |
| Focal | Lança a necessidade, escala e edita a abrangência das delegacias do seu departamento; vê a cobertura de todos |
| DTO | Tudo: versões, aporte, eventos, período da cobertura e abrangência de todos |

- O e-mail do servidor nunca aparece para outros usuários.
