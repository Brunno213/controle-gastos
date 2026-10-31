// ================= FIREBASE =================

import { initializeApp } from
"https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
} from
"https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";


const firebaseConfig = {

  apiKey: "AIzaSyBRuvYrZLMLRdV5ckKT-0r-hXsgO7umKDE",

  authDomain: "controle-estoque-b3040.firebaseapp.com",

  projectId: "controle-estoque-b3040",

  storageBucket: "controle-estoque-b3040.firebasestorage.app",

  messagingSenderId: "382920463140",

  appId: "1:382920463140:web:836453ff63c47b8fb159b1"

};


const app = initializeApp(firebaseConfig);

const db = getFirestore(app);


// ================= ELEMENTOS =================

const menuExtrato = document.getElementById("menuExtrato");

const menuRegistros = document.getElementById("menuRegistros");

const menuControle = document.getElementById("menuControle");

const extratoSection = document.getElementById("extratoSection");

const registrosSection = document.getElementById("registrosSection");

const controleSection = document.getElementById("controleSection");

const formLancamento = document.getElementById("formLancamento");

const tabelaLancamentos = document.getElementById("tabelaLancamentos");

const tabelaControle = document.getElementById("tabelaControle");


// ================= VARIÁVEIS =================

let editId = null;

let graficoMensal = null;

let todosLancamentos = [];

let lancamentosControle = [];

const meses = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro"
];


// ================= AUXILIARES =================

function formatarValor(valor) {

  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

}


function escaparHTML(valor) {

  return String(valor ?? "").replace(/[&<>"']/g, caractere => {

    const caracteres = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return caracteres[caractere];

  });

}


function formatarData(data) {

  if (!data) return "";

  const partes = data.split("-");

  if (partes.length !== 3) return data;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;

}


function mostrarToast(mensagem) {

  document.getElementById("toastMsg").textContent = mensagem;

  const toastElement = document.getElementById("liveToast");

  const toast = bootstrap.Toast.getOrCreateInstance(toastElement);

  toast.show();

}


// ================= NAVEGAÇÃO =================

function mostrarSecao(secao) {

  [
    extratoSection,
    registrosSection,
    controleSection
  ].forEach(s => {

    s.style.display = "none";

  });


  secao.style.display = "block";


  [
    menuExtrato,
    menuRegistros,
    menuControle
  ].forEach(menu => {

    menu.classList.remove("active");

  });


  if (secao === extratoSection) {

    menuExtrato.classList.add("active");

  }

  if (secao === registrosSection) {

    menuRegistros.classList.add("active");

  }

  if (secao === controleSection) {

    menuControle.classList.add("active");

  }

}


menuExtrato.onclick = e => {

  e.preventDefault();

  mostrarSecao(extratoSection);

};


menuRegistros.onclick = e => {

  e.preventDefault();

  mostrarSecao(registrosSection);

  carregarLancamentos();

};


menuControle.onclick = e => {

  e.preventDefault();

  mostrarSecao(controleSection);

  carregarControle();

};


// ================= AUTO MÊS =================

document.getElementById("data").addEventListener("change", e => {

  const data = e.target.value;

  if (!data) {

    document.getElementById("mes").value = "";

    return;

  }

  const numeroMes = Number(data.split("-")[1]);

  document.getElementById("mes").value = meses[numeroMes - 1];

});


// ================= SALVAR LANÇAMENTO =================

formLancamento.addEventListener("submit", async e => {

  e.preventDefault();

  const data = document.getElementById("data").value;

  const mes = document.getElementById("mes").value;

  const categoria = document.getElementById("categoria").value;

  const descricao = document.getElementById("descricao").value.trim();

  const valor = Number(document.getElementById("valor").value);


  if (!data || !mes || !categoria || !descricao || !Number.isFinite(valor) || valor <= 0) {

    mostrarToast("Preencha todos os campos corretamente.");

    return;

  }


  const dados = {

    data,
    mes,
    categoria,
    descricao,
    valor

  };


  try {

    if (editId) {

      await updateDoc(doc(db, "lancamentos", editId), dados);

      editId = null;

      document.getElementById("btnSalvar").textContent = "Salvar";

      mostrarToast("Lançamento atualizado com sucesso!");

    } else {

      await addDoc(collection(db, "lancamentos"), {

        ...dados,

        timestamp: new Date()

      });

      mostrarToast("Lançamento salvo com sucesso!");

    }


    formLancamento.reset();

    await carregarLancamentos();

    await carregarControle();


  } catch (erro) {

    console.error("Erro ao salvar:", erro);

    mostrarToast("Erro ao salvar lançamento.");

  }

});


// ================= CARREGAR REGISTROS =================

async function carregarLancamentos() {

  tabelaLancamentos.innerHTML = "";

  try {

    const snap = await getDocs(collection(db, "lancamentos"));

    todosLancamentos = snap.docs.map(d => ({

      id: d.id,

      ...d.data()

    }));


    // Ordenar por data, mais recente primeiro

    todosLancamentos.sort((a, b) => {

      return (b.data || "").localeCompare(a.data || "");

    });


    filtrarLancamentos();


  } catch (erro) {

    console.error("Erro ao carregar registros:", erro);

    mostrarToast("Erro ao carregar registros.");

  }

}


// ================= FILTRAR REGISTROS =================

function filtrarLancamentos() {

  const pesquisa = document
    .getElementById("pesquisaDescricao")
    .value
    .toLowerCase();

  const filtroMes = document.getElementById("filtroMes").value;


  const filtrados = todosLancamentos.filter(l => {

    const correspondeDescricao = (l.descricao || "")
      .toLowerCase()
      .includes(pesquisa);

    const correspondeMes = !filtroMes || l.mes === filtroMes;

    return correspondeDescricao && correspondeMes;

  });


  tabelaLancamentos.innerHTML = "";


  if (!filtrados.length) {

    tabelaLancamentos.innerHTML = `
      <tr>
        <td colspan="6" class="text-center">
          Nenhum lançamento encontrado.
        </td>
      </tr>
    `;

    return;

  }


  filtrados.forEach(l => {

    const tr = document.createElement("tr");

    tr.innerHTML = `

      <td>${formatarData(escaparHTML(l.data))}</td>

      <td>${escaparHTML(l.mes)}</td>

      <td>${escaparHTML(l.categoria)}</td>

      <td>${escaparHTML(l.descricao)}</td>

      <td>${formatarValor(l.valor)}</td>

      <td>

        <button
          class="btn btn-warning btn-sm"
          onclick="editar('${l.id}')"
          title="Editar"
        >
          ✏️
        </button>

        <button
          class="btn btn-danger btn-sm"
          onclick="excluir('${l.id}')"
          title="Excluir"
        >
          🗑️
        </button>

      </td>

    `;

    tabelaLancamentos.appendChild(tr);

  });

}


document.getElementById("pesquisaDescricao")
  .addEventListener("input", filtrarLancamentos);


document.getElementById("filtroMes")
  .addEventListener("change", filtrarLancamentos);


// ================= EDITAR LANÇAMENTO =================

window.editar = async id => {

  try {

    const lancamento = todosLancamentos.find(l => l.id === id);

    if (!lancamento) {

      mostrarToast("Lançamento não encontrado.");

      return;

    }


    document.getElementById("data").value = lancamento.data;

    document.getElementById("mes").value = lancamento.mes;

    document.getElementById("categoria").value = lancamento.categoria;

    document.getElementById("descricao").value = lancamento.descricao;

    document.getElementById("valor").value = lancamento.valor;


    editId = id;

    document.getElementById("btnSalvar").textContent = "Atualizar lançamento";


    mostrarSecao(extratoSection);

  } catch (erro) {

    console.error(erro);

    mostrarToast("Erro ao editar lançamento.");

  }

};


// ================= EXCLUIR LANÇAMENTO =================

window.excluir = async id => {

  if (!confirm("Deseja realmente excluir este lançamento?")) {

    return;

  }


  try {

    await deleteDoc(doc(db, "lancamentos", id));

    mostrarToast("Lançamento excluído com sucesso!");


    await carregarLancamentos();

    await carregarControle();


  } catch (erro) {

    console.error(erro);

    mostrarToast("Erro ao excluir lançamento.");

  }

};


// ================= CONTROLE POR ANO =================

async function carregarControle() {

  try {

    const snap = await getDocs(collection(db, "lancamentos"));


    lancamentosControle = snap.docs.map(d => d.data());


    // Identificar os anos cadastrados

    const anos = [...new Set(

      lancamentosControle

        .filter(l => /^\d{4}-\d{2}-\d{2}$/.test(l.data || ""))

        .map(l => l.data.split("-")[0])

    )].sort((a, b) => Number(b) - Number(a));


    if (!anos.length) {

      tabelaControle.innerHTML = `

        <p class="text-center">
          Nenhum lançamento encontrado.
        </p>

      `;

      return;

    }


    // Recuperar os filtros anteriores

    const anoAnterior = document.getElementById("filtroAnoControle")?.value;

    const mesAnterior = document.getElementById("filtroMesControle")?.value;


    const anoSelecionado = anos.includes(anoAnterior)
      ? anoAnterior
      : anos[0];


    // Montar filtro de ano e mês

    tabelaControle.innerHTML = `

      <div class="card shadow-sm mb-4">

        <div class="card-body">

          <div class="row g-3">

            <div class="col-md-6">

              <label class="form-label fw-bold">
                Selecionar ano
              </label>

              <select
                id="filtroAnoControle"
                class="form-select"
              >

                ${anos.map(ano => `

                  <option
                    value="${ano}"
                    ${ano === anoSelecionado ? "selected" : ""}
                  >
                    ${ano}
                  </option>

                `).join("")}

              </select>

            </div>


            <div class="col-md-6">

              <label class="form-label fw-bold">
                Selecionar mês
              </label>

              <select
                id="filtroMesControle"
                class="form-select"
              >

                <option value="">Todos os meses</option>

                ${meses.map((mes, index) => {

                  const numero = String(index + 1).padStart(2, "0");

                  return `

                    <option
                      value="${numero}"
                      ${mesAnterior === numero ? "selected" : ""}
                    >
                      ${mes}
                    </option>

                  `;

                }).join("")}

              </select>

            </div>

          </div>

        </div>

      </div>


      <div id="resultadoControle"></div>

    `;


    document.getElementById("filtroAnoControle")
      .addEventListener("change", carregarControle);


    document.getElementById("filtroMesControle")
      .addEventListener("change", () => {

        atualizarResultadoControle();

      });


    atualizarResultadoControle();


  } catch (erro) {

    console.error("Erro no controle:", erro);

    tabelaControle.innerHTML = `
      <p class="text-danger text-center">
        Erro ao carregar controle financeiro.
      </p>
    `;

  }

}


// ================= ATUALIZAR RESULTADO DO CONTROLE =================

function atualizarResultadoControle() {

  const ano = document.getElementById("filtroAnoControle").value;

  const mesSelecionado = document.getElementById("filtroMesControle").value;


  // Filtrar pelo ano

  const lancamentosAno = lancamentosControle.filter(l => {

    return l.data && l.data.startsWith(ano + "-");

  });


  // Criar os 12 meses

  const controle = {};


  meses.forEach((mes, index) => {

    const numero = String(index + 1).padStart(2, "0");

    controle[numero] = {

      mes,

      renda: 0,

      gasto: 0

    };

  });


  // Calcular rendas e gastos

  lancamentosAno.forEach(l => {

    const numeroMes = l.data.split("-")[1];

    if (!controle[numeroMes]) return;


    const valor = Number(l.valor) || 0;


    if (["Salário", "Renda Extra"].includes(l.categoria)) {

      controle[numeroMes].renda += valor;

    } else {

      controle[numeroMes].gasto += valor;

    }

  });


  // Aplicar filtro de mês

  let mesesExibidos = Object.entries(controle);


  if (mesSelecionado) {

    mesesExibidos = mesesExibidos.filter(([numero]) => {

      return numero === mesSelecionado;

    });

  }


  // Calcular saldo total

  let rendaTotal = 0;

  let gastoTotal = 0;


  mesesExibidos.forEach(([numero, v]) => {

    rendaTotal += v.renda;

    gastoTotal += v.gasto;

  });


  const saldoTotal = rendaTotal - gastoTotal;


  // Montar painel

  let html = `

    <h4 class="text-center mb-4">
      Controle Financeiro - ${ano}
    </h4>


    <div class="row g-3 mb-4">

      <div class="col-md-4">

        <div class="card shadow-sm text-center h-100">

          <div class="card-body">

            <h6 class="text-muted">Renda Total</h6>

            <h4 class="text-success fw-bold">
              ${formatarValor(rendaTotal)}
            </h4>

          </div>

        </div>

      </div>


      <div class="col-md-4">

        <div class="card shadow-sm text-center h-100">

          <div class="card-body">

            <h6 class="text-muted">Gastos Totais</h6>

            <h4 class="text-danger fw-bold">
              ${formatarValor(gastoTotal)}
            </h4>

          </div>

        </div>

      </div>


      <div class="col-md-4">

        <div class="card shadow-sm text-center h-100">

          <div class="card-body">

            <h6 class="text-muted">Saldo Total</h6>

            <h4 class="${saldoTotal >= 0 ? "text-success" : "text-danger"} fw-bold">
              ${formatarValor(saldoTotal)}
            </h4>

          </div>

        </div>

      </div>

    </div>


    <div class="card shadow-sm mb-4">

      <div class="card-body">

        <h5 class="text-center mb-3">
          Gráfico Financeiro - ${ano}
        </h5>

        <div style="position:relative; height:350px;">

          <canvas id="graficoMensal"></canvas>

        </div>

      </div>

    </div>


    <div class="table-responsive">

      <table class="table table-hover table-striped text-center align-middle">

        <thead class="table-success">

          <tr>

            <th>Mês</th>

            <th>Renda</th>

            <th>Gastos</th>

            <th>Saldo</th>

          </tr>

        </thead>

        <tbody>

  `;


  mesesExibidos.forEach(([numero, v]) => {

    const saldo = v.renda - v.gasto;


    html += `

      <tr>

        <td class="fw-bold">
          ${v.mes}
        </td>

        <td class="text-success">
          ${formatarValor(v.renda)}
        </td>

        <td class="text-danger">
          ${formatarValor(v.gasto)}
        </td>

        <td class="${saldo >= 0 ? "text-success" : "text-danger"} fw-bold">
          ${formatarValor(saldo)}
        </td>

      </tr>

    `;

  });


  html += `

        </tbody>

      </table>

    </div>

  `;


  document.getElementById("resultadoControle").innerHTML = html;


  // Atualizar gráfico

  renderizarGrafico(mesesExibidos);

}


// ================= GRÁFICO =================

function renderizarGrafico(mesesExibidos) {

  const ctx = document.getElementById("graficoMensal");


  if (!ctx) return;


  if (graficoMensal) {

    graficoMensal.destroy();

  }


  graficoMensal = new Chart(ctx, {

    type: "bar",

    data: {

      labels: mesesExibidos.map(([numero, v]) => v.mes),

      datasets: [

        {

          label: "Renda",

          data: mesesExibidos.map(([numero, v]) => v.renda),

          backgroundColor: "#198754"

        },


        {

          label: "Gastos",

          data: mesesExibidos.map(([numero, v]) => v.gasto),

          backgroundColor: "#dc3545"

        },


        {

          label: "Saldo",

          data: mesesExibidos.map(([numero, v]) => v.renda - v.gasto),

          backgroundColor: "#0d6efd"

        }

      ]

    },


    options: {

      responsive: true,

      maintainAspectRatio: false,

      plugins: {

        legend: {

          position: "bottom"

        }

      },

      scales: {

        y: {

          beginAtZero: true

        }

      }

    }

  });

}
