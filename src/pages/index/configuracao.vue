<template>
  <q-page padding>
    <div class="pagina">
      <div>
        <h1 class="titulo-pagina">Configurações</h1>
        <p class="subtitulo-pagina">Taxas por tipo de cliente, margens de lucro e encargos de fornecedor</p>
      </div>

      <div class="row q-col-gutter-md items-start">
        <div class="col-12 col-md-5">
          <section class="cartao q-pa-md column q-gutter-y-sm" aria-label="Taxas por tipo de cliente">
            <h2 class="titulo-secao">Taxas por tipo de cliente</h2>
            <p class="texto-apoio">
              Somada ao preço de venda (já com markup). Com taxa acima de 0%, o orçamento ganha a coluna extra.
            </p>
            <div
              v-for="t in TIPOS"
              :key="t.value"
              class="grade q-py-xs"
              style="grid-template-columns: minmax(0, 1fr) 120px; border-bottom: 1px solid #f0eee9"
            >
              <span class="text-weight-medium" style="font-size: 14px">{{ t.label }}</span>
              <q-input
                v-model="store.taxas[t.value]"
                :aria-label="'Taxa ' + t.label + ' em porcentagem'"
                placeholder="definir"
                inputmode="decimal"
                suffix="%"
                outlined
                dense
                input-class="text-right text-mono"
              />
            </div>
          </section>
        </div>

        <div class="col-12 col-md-7">
          <section class="cartao q-pa-md column q-gutter-y-sm" aria-label="Faixas de margem">
            <h2 class="titulo-secao">Sugestão automática de preço</h2>
            <q-checkbox v-model="store.autoPadrao" label="Ligada por padrão em produtos novos" />
            <p class="texto-apoio">Margem aplicada pelo custo da peça. Pode ser trocada em cada produto.</p>
            <div class="grade grade-cabecalho" style="grid-template-columns: minmax(0, 1fr) 140px 120px">
              <span class="rotulo-coluna">De</span>
              <span class="rotulo-coluna">Até (R$)</span>
              <span class="rotulo-coluna">Margem</span>
            </div>
            <div
              v-for="(f, i) in store.faixas"
              :key="'f' + i"
              class="grade"
              style="grid-template-columns: minmax(0, 1fr) 140px 120px"
            >
              <span class="text-mono" style="font-size: 14px">
                {{ i === 0 ? 'R$ 0,00' : brl(num(store.faixas[i - 1].ate) + 0.01) }}
              </span>
              <q-input
                v-model="f.ate"
                aria-label="Até"
                placeholder="sem limite"
                inputmode="decimal"
                outlined
                dense
                input-class="text-right text-mono"
              />
              <q-input
                v-model="f.margem"
                aria-label="Margem em porcentagem"
                inputmode="decimal"
                suffix="%"
                outlined
                dense
                input-class="text-right text-mono"
              />
            </div>
          </section>
        </div>
      </div>

      <section class="cartao q-pa-md column q-gutter-y-sm" aria-label="Fornecedores">
        <div class="row items-center justify-between">
          <h2 class="titulo-secao">Fornecedores e encargos</h2>
          <q-btn outline no-caps color="grey-8" icon="add" label="Adicionar fornecedor" @click="adicionarFornecedor" />
        </div>
        <p class="texto-apoio">Somados ao preço de custo antes da margem. ST em 0% = fornecedor sem ST retido.</p>
        <div class="rolagem-x">
          <div style="min-width: 760px" class="column q-gutter-y-xs">
            <div class="grade grade-cabecalho" :style="{ gridTemplateColumns: colunasFornecedor }">
              <span class="rotulo-coluna">Fornecedor</span>
              <span class="rotulo-coluna">ST %</span>
              <span class="rotulo-coluna">Frete %</span>
              <span class="rotulo-coluna">Despesas %</span>
              <span class="rotulo-coluna text-right">Encargos</span>
              <span></span>
            </div>
            <div
              v-for="(f, i) in store.fornecedores"
              :key="'fo' + i"
              class="grade"
              :style="{ gridTemplateColumns: colunasFornecedor }"
            >
              <q-input v-model="f.nome" aria-label="Nome do fornecedor" outlined dense />
              <q-input v-model="f.st" aria-label="ST" inputmode="decimal" outlined dense input-class="text-right text-mono" />
              <q-input v-model="f.frete" aria-label="Frete" inputmode="decimal" outlined dense input-class="text-right text-mono" />
              <q-input v-model="f.desp" aria-label="Despesas" inputmode="decimal" outlined dense input-class="text-right text-mono" />
              <span class="text-mono text-weight-bold text-right" style="font-size: 14px">
                +{{ pct(num(f.st) + num(f.frete) + num(f.desp)) }}
              </span>
              <span>
                <q-chip v-if="num(f.st) === 0" dense color="grey-3" text-color="grey-9" class="text-weight-bold">
                  Sem ST retido
                </q-chip>
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </q-page>
</template>

<script setup>
import { useOficinaStore, TIPOS } from '@/stores/oficina'
import { num, brl, pct } from '@/utils/formato'

const store = useOficinaStore()

const colunasFornecedor = 'minmax(200px, 1fr) 110px 110px 110px 120px 150px'

function adicionarFornecedor() {
  store.fornecedores.push({ nome: 'Novo fornecedor', st: '0', frete: '0', desp: '0' })
}
</script>
