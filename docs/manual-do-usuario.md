# Manual do usuário

## Entrar

1. Digite a sua **matrícula** e clique em **Continuar**.
2. Confira o e-mail mostrado e clique em **Enviar código para este e-mail**.
3. Digite o **código de 6 dígitos** que chegou no e-mail institucional.

Se o código não chegar, espere 60 segundos e clique em **Reenviar código**. Use sempre o último código recebido. A mensagem "Código errado ou vencido" aparece quando se usa um código antigo.

O que cada um vê depende do papel:

| Papel | Abas |
|---|---|
| Servidor | Minhas escalas |
| Focal do departamento | Necessidade de efetivo, Escala, Resumo, Relatório, Cobertura, Minhas escalas |
| DTO | Tudo, mais Versões e aporte e Evento |

## Necessidade de efetivo (focal)

1. Na lista **Delegacias**, marque uma ou várias. Use o filtro e **Marcar visíveis** para marcar muitas de uma vez. Se a delegacia não estiver na lista, digite em **Outra delegacia**.
2. Preencha tipo, data inicial, data final (se for mais de um dia), horário em que **abre** e **fecha**, e **último dia até** (se o último dia termina mais cedo).
3. Em **Efetivo por dia**, informe cada grupo: cargo, quantidade, serviço, entrada e saída. Use **+ Grupo de policiais** para mais grupos.
4. Clique em **Lançar**. Com várias delegacias marcadas, o botão mostra "Lançar nas N delegacias" e pede confirmação. Se uma der erro, as outras são gravadas e o aviso diz qual faltou.
5. Quando terminar, clique em **Enviar ao DTO**.

Abre igual a fecha significa 24 horas. A delegacia marcada com "já lançada" pode ser lançada de novo para outro período. Para corrigir, use **Editar**, que altera uma delegacia por vez. **Excluir** tira a delegacia; as vagas dela saem da escala.

## Escala (focal)

- Escolha a delegacia à esquerda e o dia nas abas.
- Digite o nome ou a matrícula do servidor e escolha na lista (setas e Enter também funcionam). Salva na hora.
- **Sem servidor** marca a vaga como não preenchida de propósito. **Limpar** desfaz.
- **Buscar servidor de outro departamento** amplia a busca. A vaga mostra "DE ..." com o departamento de origem.
- O sistema não deixa o mesmo servidor em dois lugares no mesmo horário e mostra onde ele já está.
- Vagas **Extra** só aparecem depois que o DTO autoriza o aporte.
- **Baixar CSV** exporta a escala do departamento.

## Resumo

Vagas autorizadas, com nome, sem servidor, em aberto e fora da necessidade, com os valores autorizado e escalado.

## Relatório

Funcionamento e efetivo de cada delegacia, por exemplo: "3 OIP ordinário 24h + 1 DPC e 1 OIP extra 07:00–19:00".

- Filtre por **região**, **departamento** ou nome da delegacia.
- O DTO escolhe a **fonte**: a necessidade atual ou uma versão fechada. Versão fechada não muda, então o PDF dela sai sempre igual.
- **Baixar PDF** e **CSV** saem com os filtros da tela.

## Cobertura

O mapa mostra quem atende cada cidade:

- **Quem atende:** escolha o dia e arraste a hora.
- **Situação do dia:** própria, própria + plantão, plantão, descoberta em parte ou sem abrangência.
- **Abrangência:** a área de cada plantonista. O círculo marca a sede.

Outras funções:

- **Região** aproxima o mapa e filtra legenda, relatórios e CSVs.
- Clique numa cidade para ver os detalhes.
- **Editar a abrangência:** escolha a plantonista, clique nas cidades do mapa ou digite o nome, e salve. O focal edita as plantonistas do próprio departamento; o DTO edita todas.
- O relatório embaixo lista cidade por cidade, com CSV e impressão.

## Versões e aporte (DTO)

- **Fechar versão** guarda uma cópia congelada da necessidade de todos os departamentos, com o custo.
- **Autorizar aporte** de uma versão libera as vagas Extra dela na escala. Só uma versão fica autorizada por vez.

## Evento (DTO)

- Abra e feche o **recebimento** (focais lançam e alteram a necessidade) e a **escala** (focais colocam nomes).
- Acompanhe a situação de cada departamento.
- Crie um novo evento.
