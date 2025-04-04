
import { useState, useEffect } from "react";
import html2canvas from "html2canvas";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from "recharts";

function calcularDados(form) {
  const loja = parseFloat(form.vendasLoja) || 0;
  const ifood = parseFloat(form.vendasIfood) || 0;
  const total = loja + ifood;
  const clientesLoja = parseInt(form.clientesLoja) || 0;
  const clientesIfood = parseInt(form.clientesIfood) || 0;
  const totalClientes = clientesLoja + clientesIfood;
  const ticketMedioLoja = loja / (clientesLoja || 1);
  const ticketMedioIfood = ifood / (clientesIfood || 1);
  const ticketMedioGeral = total / (totalClientes || 1);
  const taxa = loja * 0.03;

  return {
    loja, ifood, total, clientesLoja, clientesIfood,
    totalClientes, ticketMedioLoja, ticketMedioIfood,
    ticketMedioGeral, taxa
  };
}

function getFormattedDate(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().split("T")[0];
}

export default function App() {
  const [form, setForm] = useState({
    vendasLoja: "", vendasIfood: "", clientesLoja: "", clientesIfood: "",
    saldoFinalConta: "", saldoFinalCofre: "", receitasExtras: "", despesas: ""
  });
  const [output, setOutput] = useState("");
  const [showImageButton, setShowImageButton] = useState(false);
  const [historico, setHistorico] = useState([]);
  const [filtro, setFiltro] = useState("7dias");
  const [dadosFiltrados, setDadosFiltrados] = useState([]);

  useEffect(() => {
    const ontem = getFormattedDate(-1);
    const hoje = getFormattedDate();
    const dadosOntem = localStorage.getItem(ontem);
    if (dadosOntem) {
      const parsed = JSON.parse(dadosOntem);
      setForm((prev) => ({
        ...prev,
        saldoFinalConta: parsed.saldoFinalConta || "",
        saldoFinalCofre: parsed.saldoFinalCofre || ""
      }));
    }
    const dadosHoje = localStorage.getItem(hoje);
    if (dadosHoje) setForm(JSON.parse(dadosHoje));

    const entries = Object.entries(localStorage)
      .filter(([key]) => /^\d{4}-\d{2}-\d{2}$/.test(key))
      .map(([key, value]) => {
        const data = JSON.parse(value);
        const { loja, ifood, total, clientesLoja, clientesIfood, ticketMedioGeral } = calcularDados(data);
        const despesas = data.despesas.split("\n").reduce((acc, linha) => {
          const valor = parseFloat(linha.split("R$")[1]?.replace(",", ".") || 0);
          return acc + valor;
        }, 0);
        const resultado = loja + ifood - despesas;
        return {
          data: key, receita: total, despesas, resultado,
          ticketMedio: ticketMedioGeral, clientes: clientesLoja + clientesIfood
        };
      });

    setHistorico(entries.sort((a, b) => a.data.localeCompare(b.data)));
  }, []);

  useEffect(() => {
    const agora = new Date();
    let dataInicial = new Date();
    if (filtro === "7dias") dataInicial.setDate(agora.getDate() - 6);
    if (filtro === "mes") dataInicial = new Date(agora.getFullYear(), agora.getMonth(), 1);
    setDadosFiltrados(historico.filter((d) => new Date(d.data) >= dataInicial));
  }, [filtro, historico]);

  const totais = dadosFiltrados.reduce((acc, d) => {
    acc.receita += d.receita;
    acc.despesas += d.despesas;
    acc.resultado += d.resultado;
    acc.clientes += d.clientes;
    acc.ticketSoma += d.ticketMedio;
    acc.dias += 1;
    if (d.resultado > 0) acc.diasPositivos += 1;
    return acc;
  }, { receita: 0, despesas: 0, resultado: 0, clientes: 0, ticketSoma: 0, dias: 0, diasPositivos: 0 });

  const handleChange = (e) => {
    const updatedForm = { ...form, [e.target.name]: e.target.value };
    setForm(updatedForm);
    localStorage.setItem(getFormattedDate(), JSON.stringify(updatedForm));
  };

  const calcular = () => {
    const dataAtual = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric"
    });
    const {
      loja, ifood, total, clientesLoja, clientesIfood,
      totalClientes, ticketMedioLoja, ticketMedioIfood, ticketMedioGeral
    } = calcularDados(form);

    const outputText = `MERCADO DE SANTA\nINFORME FINANCEIRO – ${dataAtual}\n\nVENDAS\n| Loja: R$ ${loja.toFixed(2)} | iFood: R$ ${ifood.toFixed(2)} | Total: R$ ${total.toFixed(2)} |\n\nClientes Atendidos: ${totalClientes} (Loja: ${clientesLoja} | iFood: ${clientesIfood})\nTicket Médio:\n• Loja: R$ ${ticketMedioLoja.toFixed(2)}\n• iFood: R$ ${ticketMedioIfood.toFixed(2)}\n• Geral: R$ ${ticketMedioGeral.toFixed(2)}\n\nReceitas Extras:\n${form.receitasExtras}\n\nDespesas:\n${form.despesas}\n\nSaldo Final em Conta: R$ ${form.saldoFinalConta}\nSaldo Final no Cofre: R$ ${form.saldoFinalCofre}`;

    setOutput(outputText);
    setShowImageButton(true);
  };

  const exportAsImage = async () => {
    const element = document.getElementById("informe-export");
    if (element) {
      try {
        const canvas = await html2canvas(element);
        const link = document.createElement("a");
        link.download = `informe-${getFormattedDate()}.png`;
        link.href = canvas.toDataURL();
        link.click();
      } catch (error) {
        console.error("Erro ao exportar imagem:", error);
      }
    }
  };

  return (
    <div className="grid gap-6 p-4 max-w-6xl mx-auto">
      {dadosFiltrados.length > 0 && (
        <div className="grid gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Dashboard</h2>
            <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="border px-2 py-1 rounded">
              <option value="7dias">Últimos 7 dias</option>
              <option value="mes">Mês atual</option>
            </select>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>Receita: R$ {totais.receita.toFixed(2)}</div>
            <div>Despesas: R$ {totais.despesas.toFixed(2)}</div>
            <div>Lucro: R$ {totais.resultado.toFixed(2)}</div>
            <div>Ticket Médio: R$ {(totais.ticketSoma / (totais.dias || 1)).toFixed(2)}</div>
            <div>Clientes: {totais.clientes}</div>
            <div>Dias com lucro: {totais.diasPositivos} / {totais.dias}</div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dadosFiltrados}>
              <XAxis dataKey="data" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="receita" stroke="#4ade80" name="Receita" />
              <Line type="monotone" dataKey="despesas" stroke="#f87171" name="Despesas" />
              <Line type="monotone" dataKey="resultado" stroke="#60a5fa" name="Resultado" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <h2 className="text-xl font-bold mt-6">Informe Diário</h2>
      <input name="vendasLoja" placeholder="Vendas em Loja (R$)" value={form.vendasLoja} onChange={handleChange} />
      <input name="vendasIfood" placeholder="Vendas iFood (R$)" value={form.vendasIfood} onChange={handleChange} />
      <input name="clientesLoja" placeholder="Clientes Loja" value={form.clientesLoja} onChange={handleChange} />
      <input name="clientesIfood" placeholder="Clientes iFood" value={form.clientesIfood} onChange={handleChange} />
      <textarea name="receitasExtras" placeholder="Receitas Extras" value={form.receitasExtras} onChange={handleChange} />
      <textarea name="despesas" placeholder="Despesas" value={form.despesas} onChange={handleChange} />
      <input name="saldoFinalConta" placeholder="Saldo Final Conta" value={form.saldoFinalConta} onChange={handleChange} />
      <input name="saldoFinalCofre" placeholder="Saldo Final Cofre" value={form.saldoFinalCofre} onChange={handleChange} />
      <button onClick={calcular}>Gerar Informe</button>

      {output && (
        <div id="informe-export" className="bg-white p-4 mt-4 rounded shadow whitespace-pre-wrap">
          <h3 className="text-lg font-semibold mb-2">Informe Gerado</h3>
          {output}
        </div>
      )}
      {showImageButton && (
        <button onClick={exportAsImage} className="bg-blue-600 text-white px-4 py-2 rounded mt-2">Exportar como Imagem</button>
      )}
    </div>
  );
}
