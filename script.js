import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBRuvYrZLMLRdV5ckKT-0r-hXsgO7umKDE",
  authDomain: "controle-estoque-b3040.firebaseapp.com",
  projectId: "controle-estoque-b3040",
  storageBucket: "controle-estoque-b3040.firebasestorage.app",
  messagingSenderId: "382920463140",
  appId: "1:382920463140:web:836453ff63c47b8fb159b1",
  measurementId: "G-TWDYX1DND1"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ====================== Navegação ==========================
const menuExtrato = document.getElementById("menuExtrato");
const menuRegistros = document.getElementById("menuRegistros");
const menuControle = document.getElementById("menuControle");
const extratoSection = document.getElementById("extratoSection");
const registrosSection = document.getElementById("registrosSection");
const controleSection = document.getElementById("controleSection");

function mostrarSecao(secao) {
  extratoSection.style.display = "none";
  registrosSection.style.display = "none";
  controleSection.style.display = "none";
  secao.style.display = "block";
  [menuExtrato, menuRegistros, menuControle].forEach(btn => btn.classList.remove("active"));
  if (secao === extratoSection) menuExtrato.classList.add("active");
  if (secao === registrosSection) menuRegistros.classList.add("active");
  if (secao === controleSection) menuControle.classList.add("active");
}
menuExtrato.addEventListener("click", () => mostrarSecao(extratoSection));
menuRegistros.addEventListener("click", () => { mostrarSecao(registrosSection); carregarLancamentos(); });
menuControle.addEventListener("click", () => { mostrarSecao(controleSection); carregarControle(); });

// ====================== Funções Auxiliares ==========================
function showToast(msg, color = "bg-success") {
  const toastEl = document.getElementById("liveToast");
  const msgEl = document.getElementById("toastMsg");
  toastEl.className = `toast align-items-center text-white border-0 ${color}`;
  msgEl.textContent = msg;
  const toast = new bootstrap.Toast(toastEl);
  toast.show();
}

function formatarValor(v) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Auto preencher mês
document.getElementById("data").addEventListener("change", (e) => {
  const data = new Date(e.target.value);
  if (!isNaN(data)) {
    const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    document.getElementById("mes").value = meses[data.getMonth()];
  }
});

let editId = null;

// ====================== CRUD ==========================
document.getElementById("formLancamento").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = document.getElementById("data").value;
  const mes = document.getElementById("mes").value;
  const categoria = document.getElementById("categoria").value;
  const descricao = document.getElementById("descricao").value;
  const valor = parseFloat(document.getElementById("valor").value);

  if (editId) {
    await updateDoc(doc(db, "lancamentos", editId), { data, mes, categoria, descricao, valor });
    showToast("Lançamento atualizado!", "bg-warning");
    editId = null;
  } else {
    await addDoc(collection(db, "lancamentos"), { data, mes, categoria, descricao, valor, timestamp: new Date() });
    showToast("Lançamento adicionado com sucesso!");
  }
  e.target.reset();
  document.getElementById("mes").value = "";
  carregarLancamentos();
  carregarControle();
});

// ====================== Tabela de Registros ==========================
async function carregarLancamentos() {
  const tabela = document.getElementById("tabelaLancamentos");
  tabela.innerHTML = "";
  const pesquisa = document.getElementById("pesquisaDescricao").value.toLowerCase();
  const filtroMes = document.getElementById("filtroMes").value;

  const q = query(collection(db, "lancamentos"), orderBy("timestamp", "desc"));
  const snap = await getDocs(q);

  snap.forEach((d) => {
    const l = d.data();
    const matchDescricao = l.descricao.toLowerCase().includes(pesquisa);
    const matchMes = !filtroMes || l.mes === filtroMes;
    if (matchDescricao && matchMes) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${new Date(l.data).toLocaleDateString("pt-BR")}</td>
        <td>${l.mes}</td>
        <td>${l.categoria}</td>
        <td>${l.descricao}</td>
        <td>${formatarValor(l.valor)}</td>
        <td>
          <button class="btn btn-warning btn-sm" onclick="editar('${d.id}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="excluir('${d.id}')">🗑️</button>
        </td>`;
      tabela.appendChild(tr);
    }
  });
}

window.editar = async (id) => {
  const snap = await getDocs(collection(db, "lancamentos"));
  const docData = snap.docs.find(d => d.id === id);
  if (docData) {
    const l = docData.data();
    document.getElementById("data").value = l.data;
    document.getElementById("mes").value = l.mes;
    document.getElementById("categoria").value = l.categoria;
    document.getElementById("descricao").value = l.descricao;
    document.getElementById("valor").value = l.valor;
    editId = id;
    mostrarSecao(extratoSection);
  }
};

window.excluir = async (id) => {
  if (confirm("Deseja excluir este lançamento?")) {
    await deleteDoc(doc(db, "lancamentos", id));
    showToast("Lançamento excluído!", "bg-danger");
    carregarLancamentos();
    carregarControle();
  }
};

document.getElementById("pesquisaDescricao").addEventListener("input", carregarLancamentos);
document.getElementById("filtroMes").addEventListener("change", carregarLancamentos);

// ====================== Controle Mensal ==========================
async function carregarControle() {
  const snap = await getDocs(collection(db, "lancamentos"));
  const lanc = snap.docs.map(d => d.data());
  if (!lanc.length) {
    document.getElementById("tabelaControle").innerHTML = "<p class='text-center text-muted'>Nenhum lançamento cadastrado.</p>";
    return;
  }

  const controle = {};
  lanc.forEach(l => {
    const mes = l.mes;
    if (!controle[mes]) controle[mes] = { renda: 0, gasto: 0, categorias: {} };
    if (["Salário", "Renda Extra"].includes(l.categoria)) controle[mes].renda += l.valor;
    else controle[mes].gasto += l.valor;
    controle[mes].categorias[l.categoria] = (controle[mes].categorias[l.categoria] || 0) + 1;
  });

  let html = `
  <table class="table table-hover text-center align-middle">
    <thead class="table-success">
      <tr><th>Mês</th><th>Renda Total</th><th>Gasto Total</th><th>Saldo</th></tr>
    </thead><tbody>`;
  Object.entries(controle).forEach(([mes, v]) => {
    const saldo = v.renda - v.gasto;
    html += `
      <tr>
        <td>${mes}</td>
        <td class="text-success fw-bold">${formatarValor(v.renda)}</td>
        <td class="text-danger fw-bold">${formatarValor(v.gasto)}</td>
        <td class="${saldo >= 0 ? "text-success" : "text-danger"} fw-bold">${formatarValor(saldo)}</td>
      </tr>`;
  });
  html += `</tbody></table>`;

  const freq = {};
  lanc.filter(l => !["Salário","Renda Extra"].includes(l.categoria))
      .forEach(l => freq[l.categoria] = (freq[l.categoria] || 0) + 1);
  const maisFreq = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,5);

  html += `<div class="mt-4"><h5 class="text-center text-success">Gastos Mais Frequentes</h5>`;
  html += maisFreq.length ? `<ul class="list-group mx-auto" style="max-width:400px;">` +
    maisFreq.map(([cat, qtd]) => `<li class="list-group-item d-flex justify-content-between"><span>${cat}</span><span class="badge bg-danger">${qtd}x</span></li>`).join("") +
    `</ul>` : `<p class='text-center text-muted'>Nenhum gasto registrado.</p>`;
  html += `</div>`;

  document.getElementById("tabelaControle").innerHTML = html;
}
