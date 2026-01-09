import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs,
  updateDoc, deleteDoc, doc, query, orderBy
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ================= FIREBASE =================
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

// ================= NAVEGAÇÃO =================
const menuExtrato = document.getElementById("menuExtrato");
const menuRegistros = document.getElementById("menuRegistros");
const menuControle = document.getElementById("menuControle");

const extratoSection = document.getElementById("extratoSection");
const registrosSection = document.getElementById("registrosSection");
const controleSection = document.getElementById("controleSection");

function mostrarSecao(secao) {
  [extratoSection, registrosSection, controleSection].forEach(s => s.style.display = "none");
  secao.style.display = "block";

  [menuExtrato, menuRegistros, menuControle].forEach(b => b.classList.remove("active"));
  if (secao === extratoSection) menuExtrato.classList.add("active");
  if (secao === registrosSection) menuRegistros.classList.add("active");
  if (secao === controleSection) menuControle.classList.add("active");
}

menuExtrato.onclick = () => mostrarSecao(extratoSection);
menuRegistros.onclick = () => { mostrarSecao(registrosSection); carregarLancamentos(); };
menuControle.onclick = () => { mostrarSecao(controleSection); carregarControle(); };

// ================= AUXILIARES =================
function formatarValor(v) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

let editId = null;
let graficoMensal = null;

// Auto mês
document.getElementById("data").addEventListener("change", e => {
  const d = new Date(e.target.value);
  const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  if (!isNaN(d)) document.getElementById("mes").value = meses[d.getMonth()];
});

// ================= CRUD =================
document.getElementById("formLancamento").addEventListener("submit", async e => {
  e.preventDefault();

  const data = document.getElementById("data").value;
  const mes = document.getElementById("mes").value;
  const categoria = document.getElementById("categoria").value;
  const descricao = document.getElementById("descricao").value;
  const valor = parseFloat(document.getElementById("valor").value);

  if (editId) {
    await updateDoc(doc(db, "lancamentos", editId), { data, mes, categoria, descricao, valor });
    editId = null;
  } else {
    await addDoc(collection(db, "lancamentos"), {
      data, mes, categoria, descricao, valor, timestamp: new Date()
    });
  }

  e.target.reset();
  document.getElementById("mes").value = "";
  carregarLancamentos();
  carregarControle();
});

// ================= REGISTROS =================
async function carregarLancamentos() {
  const tabela = document.getElementById("tabelaLancamentos");
  tabela.innerHTML = "";

  const q = query(collection(db, "lancamentos"), orderBy("timestamp", "desc"));
  const snap = await getDocs(q);

  snap.forEach(d => {
    const l = d.data();
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
  });
}

window.editar = async id => {
  const snap = await getDocs(collection(db, "lancamentos"));
  const docSnap = snap.docs.find(d => d.id === id);
  if (!docSnap) return;

  const l = docSnap.data();
  document.getElementById("data").value = l.data;
  document.getElementById("mes").value = l.mes;
  document.getElementById("categoria").value = l.categoria;
  document.getElementById("descricao").value = l.descricao;
  document.getElementById("valor").value = l.valor;
  editId = id;
  mostrarSecao(extratoSection);
};

window.excluir = async id => {
  if (!confirm("Deseja excluir?")) return;
  await deleteDoc(doc(db, "lancamentos", id));
  carregarLancamentos();
  carregarControle();
};

// ================= CONTROLE + GRÁFICO =================
async function carregarControle() {
  const snap = await getDocs(collection(db, "lancamentos"));
  const lanc = snap.docs.map(d => d.data());

  if (!lanc.length) {
    document.getElementById("tabelaControle").innerHTML = "<p class='text-center'>Nenhum dado</p>";
    return;
  }

  const controle = {};
  lanc.forEach(l => {
    if (!controle[l.mes]) controle[l.mes] = { renda: 0, gasto: 0 };
    if (["Salário","Renda Extra"].includes(l.categoria)) controle[l.mes].renda += l.valor;
    else controle[l.mes].gasto += l.valor;
  });

  let saldoTotal = 0;
  let html = `
  <div class="card text-center mb-4">
    <div class="card-body">
      <h5>Saldo Total</h5>
      <h3 id="saldoTotal" class="fw-bold"></h3>
    </div>
  </div>

  <div class="card mb-4">
    <div class="card-body">
      <canvas id="graficoMensal"></canvas>
    </div>
  </div>

  <table class="table table-hover text-center">
    <thead class="table-success">
      <tr><th>Mês</th><th>Renda</th><th>Gasto</th><th>Saldo</th></tr>
    </thead><tbody>`;

  Object.entries(controle).forEach(([mes,v]) => {
    const saldo = v.renda - v.gasto;
    saldoTotal += saldo;
    html += `
      <tr>
        <td>${mes}</td>
        <td class="text-success">${formatarValor(v.renda)}</td>
        <td class="text-danger">${formatarValor(v.gasto)}</td>
        <td class="${saldo>=0?"text-success":"text-danger"}">${formatarValor(saldo)}</td>
      </tr>`;
  });

  html += "</tbody></table>";
  document.getElementById("tabelaControle").innerHTML = html;

  const saldoEl = document.getElementById("saldoTotal");
  saldoEl.textContent = formatarValor(saldoTotal);
  saldoEl.className = saldoTotal >= 0 ? "fw-bold text-success" : "fw-bold text-danger";

  renderizarGrafico(controle);
}

// ================= GRÁFICO =================
function renderizarGrafico(controle) {
  const ctx = document.getElementById("graficoMensal");
  if (graficoMensal) graficoMensal.destroy();

  const meses = Object.keys(controle);
  graficoMensal = new Chart(ctx, {
    type: "bar",
    data: {
      labels: meses,
      datasets: [
        { label: "Renda", data: meses.map(m=>controle[m].renda), backgroundColor:"#198754" },
        { label: "Gastos", data: meses.map(m=>controle[m].gasto), backgroundColor:"#dc3545" },
        { label: "Saldo", data: meses.map(m=>controle[m].renda - controle[m].gasto), backgroundColor:"#0d6efd" }
      ]
    }
  });
}
