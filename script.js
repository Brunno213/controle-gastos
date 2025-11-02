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

// Navegação
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

// Auto mês
document.getElementById("data").addEventListener("change", (e) => {
  const data = new Date(e.target.value);
  const mes = data.toLocaleString("pt-BR", { month: "long", year: "numeric" });
  document.getElementById("mes").value = mes.charAt(0).toUpperCase() + mes.slice(1);
});

// Formatação
function formatarValor(v) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

let editId = null;

// Salvar ou Editar
document.getElementById("formLancamento").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = document.getElementById("data").value;
  const mes = document.getElementById("mes").value;
  const categoria = document.getElementById("categoria").value;
  const descricao = document.getElementById("descricao").value;
  const valor = parseFloat(document.getElementById("valor").value);

  if (!data || !mes || !categoria || !descricao || isNaN(valor)) {
    alert("Preencha todos os campos corretamente!");
    return;
  }

  if (editId) {
    await updateDoc(doc(db, "lancamentos", editId), { data, mes, categoria, descricao, valor });
    alert("Lançamento atualizado com sucesso!");
    editId = null;
  } else {
    await addDoc(collection(db, "lancamentos"), { data, mes, categoria, descricao, valor, timestamp: new Date() });
    alert("Lançamento adicionado!");
  }

  e.target.reset();
  document.getElementById("mes").value = "";
  carregarLancamentos();
  carregarControle();
});

// Carregar lançamentos
async function carregarLancamentos() {
  const tabela = document.getElementById("tabelaLancamentos");
  tabela.innerHTML = "";
  const q = query(collection(db, "lancamentos"), orderBy("timestamp", "desc"));
  const snap = await getDocs(q);

  snap.forEach((d) => {
    const l = d.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${new Date(l.data).toLocaleDateString("pt-BR")}</td>
      <td>${l.mes}</td>
      <td>${l.categoria}</td>
      <td>${l.descricao}</td>
      <td>${formatarValor(l.valor)}</td>
      <td>
        <button class="btn btn-warning btn-sm" onclick="editar('${d.id}')">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="excluir('${d.id}')">Excluir</button>
      </td>`;
    tabela.appendChild(tr);
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
    carregarLancamentos();
    carregarControle();
  }
};

// Controle mensal
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
    const isRenda = ["Salário", "Renda Extra"].includes(l.categoria);
    if (isRenda) controle[mes].renda += l.valor;
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

  // Gastos mais frequentes
  const todasCat = {};
  lanc.forEach(l => {
    if (!["Salário", "Renda Extra"].includes(l.categoria))
      todasCat[l.categoria] = (todasCat[l.categoria] || 0) + 1;
  });
  const maisFreq = Object.entries(todasCat).sort((a, b) => b[1] - a[1]);
  html += `<div class="mt-4"><h5 class="text-center text-success">Gastos Mais Frequentes</h5>`;
  if (maisFreq.length) {
    html += `<ul class="list-group mx-auto" style="max-width:400px;">`;
    maisFreq.forEach(([cat, qtd]) => {
      html += `<li class="list-group-item d-flex justify-content-between"><span>${cat}</span><span class="badge bg-danger">${qtd}x</span></li>`;
    });
    html += `</ul>`;
  } else html += `<p class='text-center text-muted'>Nenhum gasto registrado.</p>`;
  html += `</div>`;

  document.getElementById("tabelaControle").innerHTML = html;
}
