let lancamentos = JSON.parse(localStorage.getItem("lancamentos")) || [];
let editIndex = null;

// Dark mode
const darkToggle = document.getElementById("darkToggle");
darkToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  darkToggle.textContent = document.body.classList.contains("dark")
    ? "☀️ Modo Claro" : "🌙 Modo Escuro";
  atualizarControle();
});

// Auto preencher mês ao escolher data
document.getElementById("data").addEventListener("change", (e) => {
  const data = new Date(e.target.value);
  if (!isNaN(data)) {
    const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    document.getElementById("mes").value = meses[data.getMonth()];
  }
});

// Salvar lançamento
document.getElementById("formLancamento").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = document.getElementById("data").value;
  const mes = document.getElementById("mes").value;
  const categoria = document.getElementById("categoria").value;
  const descricao = document.getElementById("descricao").value;
  const valor = parseFloat(document.getElementById("valor").value);

  if (editIndex === null) {
    lancamentos.push({ data, mes, categoria, descricao, valor });
  } else {
    lancamentos[editIndex] = { data, mes, categoria, descricao, valor };
    editIndex = null;
  }
  localStorage.setItem("lancamentos", JSON.stringify(lancamentos));
  e.target.reset();
  atualizarTabela();
  atualizarControle();
});

// Mostrar seções
function showSection(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if (id === "registros") atualizarTabela();
  if (id === "controle") atualizarControle();
}

// Atualiza tabela de registros
function atualizarTabela() {
  const tabela = document.querySelector("#tabelaRegistros tbody");
  const pesquisa = document.getElementById("pesquisa").value.toLowerCase();
  const filtroMes = document.getElementById("filtroMes").value;
  tabela.innerHTML = "";

  lancamentos
    .filter(l => (!filtroMes || l.mes === filtroMes) && l.descricao.toLowerCase().includes(pesquisa))
    .forEach((l, i) => {
      const tr = tabela.insertRow();
      tr.innerHTML = `
        <td>${l.data}</td>
        <td>${l.mes}</td>
        <td>${l.categoria}</td>
        <td>${l.descricao}</td>
        <td>R$ ${l.valor.toFixed(2)}</td>
        <td>
          <button class="btn btn-warning btn-sm" onclick="editar(${i})">Editar</button>
          <button class="btn btn-danger btn-sm" onclick="excluir(${i})">Excluir</button>
        </td>`;
    });
}

function editar(i) {
  const l = lancamentos[i];
  document.getElementById("data").value = l.data;
  document.getElementById("mes").value = l.mes;
  document.getElementById("categoria").value = l.categoria;
  document.getElementById("descricao").value = l.descricao;
  document.getElementById("valor").value = l.valor;
  editIndex = i;
  showSection("extrato");
}

function excluir(i) {
  if (confirm("Deseja excluir este lançamento?")) {
    lancamentos.splice(i, 1);
    localStorage.setItem("lancamentos", JSON.stringify(lancamentos));
    atualizarTabela();
    atualizarControle();
  }
}

document.getElementById("pesquisa").addEventListener("input", atualizarTabela);
document.getElementById("filtroMes").addEventListener("change", atualizarTabela);

// ======== CONTROLE ========
function atualizarControle() {
  if (lancamentos.length === 0) {
    document.getElementById("tabelaControle").innerHTML = "<p class='text-center text-muted'>Nenhum dado cadastrado ainda.</p>";
    return;
  }

  // Organiza por ano/mês existente
  const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const agrupado = {};

  lancamentos.forEach(l => {
    const ano = new Date(l.data).getFullYear();
    const chave = `${l.mes}/${ano}`;
    if (!agrupado[chave]) agrupado[chave] = { renda: 0, gasto: 0 };
    if (["Salário","Renda Extra"].includes(l.categoria)) agrupado[chave].renda += l.valor;
    else agrupado[chave].gasto += l.valor;
  });

  // Cria tabela dinâmica
  let html = `
    <table class="table table-hover text-center align-middle">
      <thead class="table-success">
        <tr><th>Mês/Ano</th><th>Renda Total</th><th>Gasto Total</th><th>Saldo</th><th>Proporção</th></tr>
      </thead><tbody>
  `;

  Object.keys(agrupado).forEach(chave => {
    const { renda, gasto } = agrupado[chave];
    const saldo = renda - gasto;
    const percent = renda > 0 ? Math.min((gasto / renda) * 100, 100) : 0;
    html += `
      <tr>
        <td>${chave}</td>
        <td class="text-success fw-bold">R$ ${renda.toFixed(2)}</td>
        <td class="text-danger fw-bold">R$ ${gasto.toFixed(2)}</td>
        <td class="${saldo >= 0 ? 'text-success' : 'text-danger'} fw-bold">R$ ${saldo.toFixed(2)}</td>
        <td>
          <div class="progress" style="height:10px;">
            <div class="progress-bar bg-danger" style="width:${percent}%"></div>
          </div>
        </td>
      </tr>
    `;
  });

  html += "</tbody></table>";

  // Gasto mais frequente
  const freq = {};
  lancamentos
    .filter(l => !["Salário", "Renda Extra"].includes(l.categoria))
    .forEach(l => freq[l.categoria] = (freq[l.categoria] || 0) + 1);

  const maisFrequentes = Object.entries(freq)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,3)
    .map(([cat, qtd]) => `<li class="list-group-item d-flex justify-content-between"><span>${cat}</span><span class="badge bg-danger">${qtd}x</span></li>`)
    .join("");

  html += `
    <div class="mt-4">
      <h5 class="text-center text-success">Gastos Mais Frequentes</h5>
      ${maisFrequentes ? `<ul class="list-group mt-2">${maisFrequentes}</ul>` : `<p class='text-center text-muted'>Ainda não há gastos registrados.</p>`}
    </div>
  `;

  document.getElementById("tabelaControle").innerHTML = html;
}

// Inicializa
atualizarTabela();
atualizarControle();
