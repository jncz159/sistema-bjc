"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, Cell 
} from 'recharts';

export default function SistemaBJCMasterFinal() {
  
  // ============================================================
  // [BLOQUE 1] SEGURIDAD Y HELPERS (ESCUDOS ANTI-CRASH)
  // ============================================================

  // Garantiza que siempre tengamos una fecha válida para evitar errores de renderizado
  const getFechaPeru = (dateInput) => {
    try {
        const d = dateInput ? new Date(dateInput) : new Date();
        if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
        const opciones = { timeZone: "America/Lima", year: 'numeric', month: '2-digit', day: '2-digit' };
        const partes = new Intl.DateTimeFormat('en-CA', opciones).formatToParts(d);
        const anio = partes.find(p => p.type === 'year')?.value || "2026";
        const mes = partes.find(p => p.type === 'month')?.value || "01";
        const dia = partes.find(p => p.type === 'day')?.value || "01";
        return `${anio}-${mes}-${dia}`;
    } catch (e) { 
        return new Date().toISOString().split('T')[0]; 
    }
  };

  // Formato de hora seguro para el historial operativo
  const getHoraPeru = (dateInput) => {
    if (!dateInput) return "--:--";
    try {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return "--:--";
        return d.toLocaleTimeString('es-PE', { 
            timeZone: "America/Lima", hour: '2-digit', minute: '2-digit', hour12: true 
        });
    } catch (e) { return "--:--"; }
  };

  // Limpiador de montos: Protege contra nulos, comas y caracteres extraños
  const handleInputMonto = (valor) => {
    if (valor === undefined || valor === null) return "";
    const str = String(valor);
    let limpio = str.replace(',', '.');
    return limpio.replace(/[^0-9.]/g, '');
  };

  // Etiquetas de novedad para el catálogo
  const getEtiquetaProducto = (createdAt) => {
    if (!createdAt) return null;
    try {
        const creacion = new Date(createdAt);
        const hoy = new Date();
        const diff = Math.floor((hoy - creacion) / (1000 * 60 * 60 * 24));
        if (diff <= 3) return { tipo: 'NUEVO', icono: '✨', color: '#F786C1' };
        if (diff <= 8) return { tipo: 'RECIENTE', icono: '📦', color: '#A13C6D' };
        return null;
    } catch (e) { return null; }
  };

  // ============================================================
  // [BLOQUE 2] ALMACÉN DE ESTADOS (STATE MANAGEMENT)
  // ============================================================

  const [vista, setVista] = useState('ventas'); 
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [finanzas, setFinanzas] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  // Filtros y búsquedas
  const [busqueda, setBusqueda] = useState(''); 
  const [busquedaStock, setBusquedaStock] = useState(''); 
  const [fechaConsulta, setFechaConsulta] = useState(getFechaPeru());
  
  // Datos de la operación en curso
  const [cliente, setCliente] = useState('');
  const [localidad, setLocalidad] = useState(''); 
  const [telefono, setTelefono] = useState(''); 
  const [tipoVenta, setTipoVenta] = useState('Mayor'); 
  const [cantidades, setCantidades] = useState({});
  const [coloresElegidos, setColoresElegidos] = useState({});
  const [carrito, setCarrito] = useState([]);
  const [descuento, setDescuento] = useState(0); 

  // Estados para correcciones (Historial)
  const [editandoGrupoId, setEditandoGrupoId] = useState(null); 
  const [formEditCliente, setFormEditCliente] = useState({ nombre: '', localidad: '', telefono: '' });
  const [idItemVentaEditando, setIdItemVentaEditando] = useState(null); 
  const [nuevaCantVenta, setNuevaCantVenta] = useState(0);
  
  // Estados para Gestión Financiera
  const [idFinanzaEditando, setIdFinanzaEditando] = useState(null);
  const [formEditFinanza, setFormEditFinanza] = useState({ tipo: '', descripcion: '', monto: '', origen: 'Caja Global' });
  const [formProd, setFormProd] = useState({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
  const [formFinanzas, setFormFinanzas] = useState({ tipo: 'Gasto Local', descripcion: '', monto: '', origen: 'Caja Global' });
  const [formEditStock, setFormEditStock] = useState({}); 

  const FUCSIA_PRINCIPAL = '#F786C1';
  const VERDE_BJ = '#16A34A';
  const ROJO_BJ = '#E11D48';
  const AMARILLO_BJ = '#CA8A04';

  // ============================================================
  // [BLOQUE 3] NÚCLEO DE DATOS (DB & REALTIME)
  // ============================================================

  useEffect(() => {
    const bootstrap = async () => {
        await cargarTodoDesdeNube();
        setCargando(false);
    };
    bootstrap();

    const cV = supabase.channel('v45-v').on('postgres_changes',{event:'*',schema:'public',table:'ventas'},()=>cargarTodoDesdeNube()).subscribe();
    const cP = supabase.channel('v45-p').on('postgres_changes',{event:'*',schema:'public',table:'productos'},()=>cargarTodoDesdeNube()).subscribe();
    const cF = supabase.channel('v45-f').on('postgres_changes',{event:'*',schema:'public',table:'finanzas'},()=>cargarTodoDesdeNube()).subscribe();

    return () => {
      supabase.removeChannel(cV); supabase.removeChannel(cP); supabase.removeChannel(cF);
    };
  }, []);

  const cargarTodoDesdeNube = async () => {
    try {
        const { data: pD } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
        const { data: vD } = await supabase.from('ventas').select('*').order('created_at', { ascending: true });
        const { data: fD } = await supabase.from('finanzas').select('*').order('created_at', { ascending: false });
        if (pD) setProductos(pD); if (vD) setVentas(vD); if (fD) setFinanzas(fD);
    } catch (err) { console.error("Sync Error:", err); }
  };

  // ============================================================
  // [BLOQUE 4] LÓGICA DE NEGOCIO (MEMOS BLINDADOS CONTRA NULOS)
  // ============================================================

  // 1. LOGÍSTICA: Separa Cuentas por Cobrar de Mercadería en Almacén
  const logisticaInteligente = useMemo(() => {
    if (!ventas || ventas.length === 0) return { almacen: [], cuentasPorCobrar: [] };
    try {
        const gAlmacen = {}; const gCuentas = {};
        ventas.forEach(v => {
            if (!v) return;
            const key = `${v.cliente_nombre || 'SN'}-${v.localidad || 'SZ'}`;
            if (v.estado_pedido === 'En Almacén') {
                if (!gAlmacen[key]) gAlmacen[key] = { cliente: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, items: [], total: 0 };
                gAlmacen[key].items.push(v);
                gAlmacen[key].total += (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0));
            }
            if (v.estado_pedido === 'Pendiente de Pago') {
                if (!gCuentas[key]) gCuentas[key] = { cliente: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, items: [], total: 0 };
                gCuentas[key].items.push(v);
                gCuentas[key].total += (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0));
            }
        });
        return { almacen: Object.values(gAlmacen), cuentasPorCobrar: Object.values(gCuentas) };
    } catch (e) { return { almacen: [], cuentasPorCobrar: [] }; }
  }, [ventas]);

  // 2. HISTORIAL: Agrupa ventas del día con validación de horas
  const historialVentasMaster = useMemo(() => {
    if (!ventas || ventas.length === 0) return [];
    try {
        const filtradas = ventas.filter(v => v && getFechaPeru(v.created_at) === fechaConsulta);
        const grupos = {};
        filtradas.forEach(v => {
            const hK = v.created_at ? v.created_at.substring(0,16) : "0000";
            const key = `${v.cliente_nombre || 'SN'}-${v.localidad || 'SZ'}-${hKey}`; 
            if (!grupos[key]) {
                grupos[key] = { id_grupo: key, cliente_nombre: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, hora: getHoraPeru(v.created_at), total: 0, items: [] };
            }
            grupos[key].items.push(v);
            grupos[key].total += (Number(v.precio_venta_unitario ?? 0) * Number(v.cantidad ?? 0));
        });
        return Object.values(grupos).reverse();
    } catch (e) { return []; }
  }, [ventas, fechaConsulta]);

  // 3. BALANCE FINANCIERO CRÍTICO: Bóveda vs Caja Global (Protección de Origen)
  const balanceFinancieroBunker = useMemo(() => {
    try {
        const fList = finanzas || [];
        const vList = ventas || [];
        const hoy = getFechaPeru();
        
        // Ventas de hoy excluyendo crédito
        const vHoyCash = vList.filter(v => v && getFechaPeru(v.created_at) === hoy && v.estado_pedido !== 'Pendiente de Pago');
        
        // GANANCIAS REALES (Bóveda)
        const gananciaBrutaSales = vList.reduce((acc, v) => acc + (Number(v?.ganancia_total) || 0), 0);
        const retirosDeGanancia = fList.filter(f => f && f.origen === 'Ganancias').reduce((acc, f) => acc + (Number(f.monto) || 0), 0);

        // CAJA GLOBAL (Dinero físico total)
        const in_Ventas = vList.filter(v => v && v.estado_pedido !== 'Pendiente de Pago').reduce((acc, v) => acc + (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0)), 0);
        const in_Extra = fList.filter(f => f && ['Ingreso Adicional','Inversión Inicial'].includes(f.tipo)).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
        const out_Global = fList.filter(f => f && ['Gasto Local','Inversión (Mercadería)','Retiro Personal'].includes(f.tipo)).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);

        // PUNTO DE EQUILIBRIO MENSUAL (Solo ganancias de ventas vs gastos)
        const mesActual = hoy.substring(0,7);
        const egMetaMes = fList.filter(f => f && getFechaPeru(f.created_at).substring(0,7) === mesActual && ['Gasto Local','Retiro Personal'].includes(f.tipo)).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
        const ganVentasMes = vList.filter(v => v && getFechaPeru(v.created_at).substring(0,7) === mesActual && v.estado_pedido !== 'Pendiente de Pago').reduce((a,b) => a + (Number(b.ganancia_total) || 0), 0);

        return { 
            cajaHoy: vHoyCash.reduce((acc, v) => acc + (Number(v.precio_venta_unitario ?? 0) * Number(v.cantidad ?? 0)), 0),
            ganHoy: vHoyCash.reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0),
            cajaGlobal: (in_Ventas + in_Extra - out_Global),
            disponibleBoveda: (gananciaBrutaSales - retirosDeGanancia),
            pe_progreso: egMetaMes > 0 ? (ganVentasMes / egMetaMes) * 100 : (ganVentasMes > 0 ? 100 : 0),
            pe_ganAct: ganVentasMes,
            pe_egMeta: egMetaMes
        };
    } catch (e) { 
        console.error("Crash preventivo en balance:", e);
        return { cajaHoy: 0, ganHoy: 0, cajaGlobal: 0, disponibleBoveda: 0, pe_progreso:0, pe_ganAct:0, pe_egMeta:0 }; 
    }
  }, [finanzas, ventas]);

  // 4. ANALÍTICA DE PRODUCTOS (Blindado)
  const analyticsMaster = useMemo(() => {
    try {
        const rankingProf = {};
        (ventas || []).forEach(v => {
            if (!v) return;
            const p = productos.find(prod => prod.id === v.producto_id);
            const name = p ? p.nombre : "Item Borrado";
            rankingProf[name] = (rankingProf[name] || 0) + Number(v.ganancia_total || 0);
        });
        const ranking = Object.entries(rankingProf).sort((a,b) => b[1] - a[1]).slice(0, 5);

        const hoyDate = new Date();
        const dormido = (productos || []).filter(p => {
            if (!p) return false;
            const lastSale = (ventas || []).filter(v => v && v.producto_id === p.id).pop();
            if (!lastSale) return true;
            const diff = Math.floor((hoyDate - new Date(lastSale.created_at)) / (1000 * 60 * 60 * 24));
            return diff > 20 && p.stock > 0;
        }).slice(0, 5);

        return { ranking, dormido };
    } catch (e) { return { ranking: [], dormido: [] }; }
  }, [ventas, productos]);

  const auditoriaInvTotal = useMemo(() => {
    let c = 0; let v = 0;
    (productos || []).forEach(p => { 
        if (!p) return;
        const s = Number(p.stock || 0);
        if (s > 0) { c += (Number(p.precio_compra || 0) * s); v += (Number(p.precio_venta || 0) * s); } 
    });
    return { cost: c, vent: v, util: v - c };
  }, [productos]);

  const configChartROI = [
    { n: 'Capital (Costo)', v: auditoriaInvTotal.cost || 0, fill: '#1E1B1C' },
    { n: 'Retorno (Venta)', v: auditoriaInvTotal.vent || 0, fill: FUCSIA_PRINCIPAL }
  ];

  // ============================================================
  // [BLOQUE 5] FUNCIONES DE ACCIÓN (HANDLERS)
  // ============================================================

  const addCarritoBunker = (p) => {
    const c = Number(cantidades[p.id] || 1);
    const pb = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
    const ya = carrito.filter(i => i.producto_id === p.id).reduce((acc, i) => acc + i.cantidad, 0);
    if ((Number(p.stock) || 0) < c + ya) return alert("¡Sin stock físico!");
    setCarrito([...carrito, { producto_id: p.id, nombre: p.nombre, cantidad: c, color: (coloresElegidos[p.id] || "Único"), precio_venta: pb, precio_compra: p.precio_compra }]);
  };

  const processVentaFull = async (estado) => {
    if (!cliente || !localidad) return alert("Ingresa Nombre y Zona del cliente.");
    if (carrito.length === 0) return alert("Carrito vacío.");
    
    const totV = carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0);
    const rD = totV > 0 ? (Number(descuento) / totV) : 0;

    const listaVentas = carrito.map(i => {
        const pv = Number(i.precio_venta);
        return { 
            cliente_nombre: cliente, localidad, telefono: telefono || '', producto_id: i.producto_id, 
            cantidad: i.cantidad, color: i.color, precio_venta_unitario: pv, 
            precio_costo_unitario: Number(i.precio_compra ?? 0), 
            ganancia_total: ((pv - Number(i.precio_compra ?? 0)) * i.cantidad) - ((pv * i.cantidad) * rD), 
            estado_pedido: estado 
        };
    });

    const { error } = await supabase.from('ventas').insert(listaVentas);
    if (!error) {
      for (const item of carrito) {
        const pO = productos.find(p => p.id === item.producto_id);
        if (pO) await supabase.from('productos').update({ stock: pO.stock - item.cantidad }).eq('id', item.producto_id);
      }
      setCliente(''); setLocalidad(''); setTelefono(''); setCarrito([]); setDescuento(0); alert("✅ Venta Guardada.");
    }
  };

  const cobrarVentaPendiente = async (grupo) => {
    if(confirm(`¿Confirmas pago total de S/ ${grupo.total.toFixed(2)}?`)) {
        for(let item of grupo.items) { await supabase.from('ventas').update({ estado_pedido: 'Entregado' }).eq('id', item.id); }
        alert("💰 Pago recibido. Dinero inyectado a caja global.");
    }
  };

  const handleWhatsAppTicket = (grupo) => {
    let t = `¡Hola *${grupo.cliente_nombre}*! 👋 Ticket BJ Importaciones.%0A%0A`;
    grupo.items.forEach(v => {
        const pM = productos.find(p => p.id === v.producto_id);
        t += `- *${v.cantidad}x* ${pM?.nombre || 'Item'} (${v.color}): S/ ${(v.precio_venta_unitario * v.cantidad).toFixed(2)}%0A`;
    });
    t += `%0A*TOTAL: S/ ${grupo.total.toFixed(2)}*%0A¡Gracias! 😊`;
    window.open(`https://wa.me/51${grupo.telefono?.replace(/\D/g,'')}?text=${t}`, '_blank');
  };

  const registrarGastoBunker = async (e) => {
    e.preventDefault();
    const clM = handleInputMonto(formFinanzas.monto);
    await supabase.from('finanzas').insert([{
        tipo: formFinanzas.tipo, descripcion: formFinanzas.descripcion, monto: Number(clM), origen: formFinanzas.origen 
    }]);
    setFormFinanzas({tipo:'Gasto Local', descripcion:'', monto:'', origen: 'Caja Global'}); alert("✅ Guardado.");
  };

  const syncStockBunker = async (p) => {
    const val = formEditStock[p.id] !== undefined ? formEditStock[p.id] : p.stock;
    await supabase.from('productos').update({ stock: val }).eq('id', p.id); alert("✅ Sincronizado.");
  };

  const exportExcelFinal = () => {
    let csv = "data:text/csv;charset=utf-8,Fecha,Hora,Cliente,Zona,Producto,Cant,Precio,Total\n";
    ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta).forEach(v => {
      const np = productos.find(p=>p.id===v.producto_id)?.nombre || "Item";
      csv += `${getFechaPeru(v.created_at)},${getHoraPeru(v.created_at)},${v.cliente_nombre},${v.localidad},${np},${v.cantidad},${v.precio_venta_unitario},${(v.precio_venta_unitario*v.cantidad).toFixed(2)}\n`;
    });
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `BJ_Caja_${fechaConsulta}.csv`); document.body.appendChild(link); link.click();
  };

  // ============================================================
  // [BLOQUE 6] INTERFAZ DE USUARIO (VISUAL UI)
  // ============================================================

  const sInp = { padding: '16px', borderRadius: '16px', border: `2px solid #FCC2E2`, width: '100%', outline: 'none', fontSize: '15px', boxSizing: 'border-box', backgroundColor: '#fff', transition: '0.3s' };
  const sCrd = { backgroundColor: '#ffffff', borderRadius: '35px', padding: '35px', boxShadow: `0 20px 40px rgba(247, 134, 193, 0.1)`, border: '1px solid #FFF1F2' };

  if (cargando) return <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', backgroundColor:'#FFF5F7', color:FUCSIA_PRINCIPAL, fontWeight:'900', fontSize:'1.5rem' }}>INICIANDO BJ BUNKER v45... 🚀💎</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF5F7', color: '#1E1B1C', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* 🚀 NAVBAR PRINCIPAL */}
      <header style={{ backgroundColor: '#ffffff', padding: '20px 5%', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 4px 15px rgba(0,0,0,0.06)`, flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.4rem' }}>BJ</div>
          <div><h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>BJ IMPORTACIONES</h1><small style={{ color: '#64748B', fontWeight: '900', fontSize: '10px' }}>CHICLAYO • v45 MAESTRO INMORTAL</small></div>
        </div>
        <nav style={{ display: 'flex', gap: '10px', backgroundColor: `#FCA5D415`, padding: '6px', borderRadius: '18px' }}>
          <button onClick={() => setVista('ventas')} style={{ backgroundColor: vista === 'ventas' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'ventas' ? '#fff' : FUCSIA_PRINCIPAL, padding: '12px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900' }}>VENTAS</button>
          <button onClick={() => setVista('logistica')} style={{ backgroundColor: vista === 'logistica' ? '#1E1B1C' : 'transparent', border: 'none', color: vista === 'logistica' ? '#fff' : '#1E1B1C', padding: '12px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900' }}>LOGÍSTICA</button>
          <button onClick={() => setVista('contabilidad')} style={{ backgroundColor: vista === 'contabilidad' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'contabilidad' ? '#fff' : FUCSIA_PRINCIPAL, padding: '12px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900' }}>GESTIÓN</button>
        </nav>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '30px 20px' }}>
        
        {/* ===================== TAB VENTAS ===================== */}
        {vista === 'ventas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
              <div style={sCrd}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>💰 CAJA EFECTIVO HOY</span>
                    <button onClick={exportExcelFinal} style={{ background:`${FUCSIA_PRINCIPAL}20`, border:'none', padding:'8px 15px', borderRadius:'10px', color:FUCSIA_PRINCIPAL, fontWeight:'900', fontSize:'10px' }}>EXCEL</button>
                </div>
                <h2 style={{ margin: '15px 0', fontSize: '3.5rem', fontWeight: '900' }}>S/ {balanceFinancieroBunker.cajaHoy.toFixed(2)}</h2>
                <div style={{ color: VERDE_BJ, fontWeight: '900', fontSize: '15px' }}>Ganancia Día: S/ {balanceFinancieroBunker.ganHoy.toFixed(2)}</div>
              </div>
              <div style={sCrd}>
                <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>📅 BUSCAR HISTORIAL</span>
                <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...sInp, marginTop: '15px' }} />
              </div>
            </div>

            <div style={{ ...sCrd, border: `3px solid #FCA5D4` }}>
              <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontWeight: '900', marginBottom:'25px' }}>🛒 Nueva Operación</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '30px' }}>
                <input list="cli_aut" placeholder="👤 Cliente" value={cliente} onChange={(e)=>setCliente(e.target.value)} style={sInp} />
                <datalist id="cli_aut">{[...new Set(ventas.map(v => v.cliente_nombre))].map((c, i) => <option key={i} value={c} />)}</datalist>
                <input placeholder="📱 WhatsApp" value={telefono} onChange={e => setTelefono(e.target.value)} style={sInp} />
                <input placeholder="📍 Zona" value={localidad} onChange={e => setLocalidad(e.target.value)} style={sInp} />
              </div>

              {carrito.length > 0 && (
                <div style={{ backgroundColor: '#FFF9FB', border: `3px dashed ${FUCSIA_PRINCIPAL}`, borderRadius: '25px', padding: '30px', marginBottom: '40px' }}>
                  {carrito.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #FCC2E2', paddingBottom: '15px', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}><strong>{item.cantidad}x</strong> {item.nombre} <br/><small style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900' }}>COLOR: {item.color}</small></div>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <input type="text" value={item.precio_venta} onChange={(e) => { const n = [...carrito]; n[idx].precio_venta = handleInputMonto(e.target.value); setCarrito(n); }} style={{ width: '80px', padding: '8px', borderRadius: '10px', border: '1px solid #FCA5D4', textAlign: 'center', fontSize: '17px', fontWeight: '900' }} />
                        <button onClick={() => { const n = [...carrito]; n.splice(idx, 1); setCarrito(n); }} style={{ color: '#fff', backgroundColor: FUCSIA_PRINCIPAL, border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer' }}>X</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ textAlign: 'right', marginTop: '30px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '900' }}>DSCTO S/ </span>
                    <input type="text" value={descuento} onChange={e=>setDescuento(handleInputMonto(e.target.value))} style={{ width: '130px', padding: '12px', borderRadius: '15px', border: `2px solid ${FUCSIA_PRINCIPAL}`, textAlign: 'center', fontWeight: '900', fontSize:'20px' }} />
                    <h3 style={{ margin: '10px 0', fontSize: '2.8rem', fontWeight: '900' }}>Total: S/ {(carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0) - Number(descuento)).toFixed(2)}</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '20px' }}>
                    <button onClick={() => processVentaFull('Entregado')} style={{ backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '20px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '14px' }}>✅ PAGADO/ENTREGA</button>
                    <button onClick={() => processVentaFull('En Almacén')} style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '20px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '14px' }}>📦 PAGADO/ALMACÉN</button>
                    <button onClick={() => processVentaFull('Pendiente de Pago')} style={{ backgroundColor: AMARILLO_BJ, color: '#fff', border: 'none', padding: '20px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '14px' }}>💸 DAR A PAGAR (CRÉDITO)</button>
                  </div>
                </div>
              )}

              <input placeholder="🔍 Buscar modelo..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...sInp, marginBottom: '25px', height: '65px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '25px', maxHeight: '750px', overflowY: 'auto' }}>
                {productos.filter(p => p.nombre?.toLowerCase().includes(busqueda.toLowerCase())).map((p) => {
                  const t = getEtiquetaProducto(p.created_at);
                  const pShow = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
                  return (
                    <div key={p.id} style={{ border: '1px solid #FFF1F2', padding: '22px', borderRadius: '35px', backgroundColor: '#fff', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
                      {t && <span style={{ position:'absolute', top: '-15px', left: '20px', backgroundColor: t.color, color: '#fff', fontSize: '10px', padding: '6px 15px', borderRadius: '15px', fontWeight: '900' }}>{t.tipo}</span>}
                      <strong style={{ display: 'block', height: '45px', overflow: 'hidden', fontSize: '16px' }}>{p.nombre}</strong>
                      <div style={{ margin: '10px 0', padding: '10px', backgroundColor: p.stock < 5 ? '#FFF1F2' : '#F0FDF4', borderRadius: '18px', textAlign: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: '900', color: p.stock < 5 ? ROJO_BJ : VERDE_BJ }}>STOCK: {p.stock}</span>
                      </div>
                      <select value={coloresElegidos[p.id]} onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{ ...sInp, padding: '10px', fontSize: '14px', marginBottom: '18px', height: '50px' }}>
                        {p.colores?.split(',').map(c => <option key={c} value={c.trim()}>{c.trim()}</option>)}
                      </select>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '18px', marginBottom: '22px' }}>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.max(1, (cantidades[p.id] || 1) - 1)})} style={{ border: 'none', background: '#f5f5f5', borderRadius: '12px', width: '48px', height: '48px', cursor:'pointer' }}>-</button>
                        <span style={{ fontWeight: '900', fontSize: '22px', paddingTop:'10px' }}>{cantidades[p.id] || 1}</span>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.min(p.stock, (cantidades[p.id] || 1) + 1)})} style={{ border: 'none', background: '#f5f5f5', borderRadius: '12px', width: '48px', height: '48px', cursor:'pointer' }}>+</button>
                      </div>
                      <button onClick={() => addCarritoBunker(p)} disabled={p.stock <= 0} style={{ width: '100%', backgroundColor: tipoVenta === 'Mayor' ? '#1E1B1C' : '#A13C6D', color: '#fff', border: 'none', padding: '18px', borderRadius: '22px', fontSize: '14px', fontWeight: '900', cursor:'pointer' }}>
                        {p.stock > 0 ? `VENDER S/ ${Number(pShow).toFixed(2)}` : 'AGOTADO'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={sCrd}>
                <h4 style={{margin:0, color:'#64748B', fontWeight:'900', fontSize:'13px', textTransform:'uppercase', marginBottom:'25px'}}>📜 Historial del Día Seleccionado</h4>
                {historialVentasMaster.map(grupo => (
                    <div key={grupo.id_grupo} style={{ padding: '25px', backgroundColor: '#FFF5F7', borderRadius: '25px', border: `1px solid #FCC2E2`, marginBottom:'20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                            <div>
                                <small style={{ fontWeight:'900', color: FUCSIA_PRINCIPAL }}>⏰ {grupo.hora}</small>
                                <br/><strong style={{ color: '#1E1B1C', fontSize: '22px' }}>{grupo.cliente_nombre}</strong>
                                <br/><small>📍 {grupo.localidad} | 📱 {grupo.telefono}</small>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ backgroundColor: VERDE_BJ, color: '#fff', padding: '10px 20px', borderRadius: '12px', fontWeight: '900' }}>S/ {grupo.total.toFixed(2)}</div>
                                <button onClick={() => handleWhatsAppTicket(grupo)} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '12px', fontWeight:'900' }}>TICKET 📱</button>
                                <button onClick={() => {setEditandoGrupoId(grupo.id_grupo); setFormEditCliente({nombre: grupo.cliente_nombre, localidad: grupo.localidad, telefono: grupo.telefono});}} style={{ border:'none', background:'#fff', padding:'10px', borderRadius:'12px', cursor:'pointer', border:'2px solid #FCC2E2' }}>✏️</button>
                            </div>
                        </div>
                        <div style={{marginTop:'15px'}}>{grupo.items.map(v => (
                            <div key={v.id} style={{background:'#fff', padding:'10px 20px', borderRadius:'15px', marginBottom:'8px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <div><small>{v.cantidad}x {productos.find(p=>p.id===v.producto_id)?.nombre || 'Item'} ({v.color}) | {v.estado_pedido}</small></div>
                                <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                                    <strong>S/ {(v.precio_venta_unitario * v.cantidad).toFixed(2)}</strong>
                                    <button onClick={()=>handleAnularVentaTotal(v)} style={{border:'none', background:'none', color:ROJO_BJ, fontWeight:'bold'}}>🗑️</button>
                                </div>
                            </div>
                        ))}</div>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* ===================== TAB LOGÍSTICA ===================== */}
        {vista === 'logistica' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            <div style={{ ...sCrd, backgroundColor: '#1E1B1C', color: '#fff', padding: '40px', textAlign: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900' }}>📦 Centro Operativo BJ</h2>
                <p style={{opacity:0.7}}>Gestión de entregas físicas y cobranzas pendientes.</p>
            </div>
            
            <div style={sCrd}>
                <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: FUCSIA_PRINCIPAL, marginBottom:'25px' }}>📦 Entregas Pendientes (Pagado)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {logisticaDividida.almacen.map((grupo, idx) => (
                        <div key={idx} style={{ padding: '25px', border: '1px solid #f1f1f1', borderRadius: '25px' }}>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
                                <div><strong>{grupo.cliente}</strong><br/><small>{grupo.localidad}</small></div>
                                <button onClick={() => { let m = `¡Hola *${grupo.cliente}*! 👋 Tu pedido en BJ Importaciones ya está listo. ✨📦`; window.open(`https://wa.me/51${grupo.telefono?.replace(/\D/g,'')}?text=${m}`, '_blank'); }} style={{ background:'#25D366', color:'#fff', border:'none', padding:'10px 15px', borderRadius:'12px', fontWeight:'900', cursor:'pointer' }}>AVISAR 📱</button>
                            </div>
                            <button onClick={async () => { if(confirm("¿Entregaste el pedido?")) { for(let i of grupo.items) await supabase.from('ventas').update({estado_pedido:'Entregado'}).eq('id', i.id); } }} style={{ width: '100%', backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: '900', cursor:'pointer' }}>MARCAR ENTREGADO ✅</button>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ ...sCrd, borderLeft: `15px solid ${AMARILLO_BJ}` }}>
                <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: AMARILLO_BJ, marginBottom:'25px' }}>💸 Cuentas por Cobrar (Ventas a Crédito)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {logisticaDividida.cuentasPorCobrar.map((grupo, idx) => (
                        <div key={idx} style={{ padding: '25px', backgroundColor: '#FFFBEB', borderRadius: '25px', border:`1px solid ${AMARILLO_BJ}40` }}>
                            <strong>{grupo.cliente}</strong><br/><small>{grupo.localidad}</small>
                            <h4 style={{color:AMARILLO_AVISO, margin:'10px 0'}}>SALDO DEUDOR: S/ {grupo.total.toFixed(2)}</h4>
                            <button onClick={() => handleCobrarVenta(grupo)} style={{ width: '100%', backgroundColor: VERDE_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: '900', cursor:'pointer' }}>💰 REGISTRAR PAGO (COBRAR)</button>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        )}

        {/* ===================== TAB GESTIÓN (BUNKER) ===================== */}
        {vista === 'contabilidad' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
                {/* PUNTO DE EQUILIBRIO MENSUAL */}
                <div style={sCrd}>
                    <h4 style={{margin:0, color:FUCSIA_PRINCIPAL, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>🏁 PUNTO DE EQUILIBRIO (GANANCIA REAL VENTAS)</h4>
                    <div style={{height:'20px', width:'100%', backgroundColor:'#F1F5F9', borderRadius:'10px', overflow:'hidden', marginBottom:'15px'}}>
                        <div style={{height:'100%', width:`${balanceFinancieroBunker.pe_progreso}%`, backgroundColor:VERDE_BJ, transition:'1s'}}></div>
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'13px'}}>
                        <span>Utilidad: S/ {balanceFinancieroBunker.pe_ganAct.toFixed(2)}</span>
                        <strong>Gastos Meta: S/ {balanceFinancieroBunker.pe_egMeta.toFixed(2)}</strong>
                    </div>
                    {balanceFinancieroBunker.pe_progreso < 100 ? <small style={{color:ROJO_BJ, fontWeight:'bold', display:'block', marginTop:'5px'}}>Faltan S/ {(balanceFinancieroBunker.pe_egMeta - balanceFinancieroBunker.pe_ganAct).toFixed(2)} de utilidad para cubrir gastos fijos.</small> : <small style={{color:VERDE_BJ, fontWeight:'bold', display:'block', marginTop:'5px'}}>¡Meta superada! Tu negocio es rentable este mes.</small>}
                </div>

                {/* BOVEDA DE GANANCIA DISPONIBLE */}
                <div style={{ ...sCrd, backgroundColor: '#1E1B1C', color: '#fff', border:`4px solid ${FUCSIA_PRINCIPAL}` }}>
                    <h4 style={{margin:0, color:FUCSIA_PRINCIPAL, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>💰 BÓVEDA: DISPONIBLE PARA RETIRO (UTILIDAD NETA)</h4>
                    <h3 style={{fontSize:'3.2rem', margin:0}}>S/ {balanceFinancieroBunker.disponibleBoveda.toFixed(2)}</h3>
                    <small style={{opacity:0.6}}>Ganancia total histórica restando los retiros personales marcados de "Ganancias".</small>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
                <div style={{ ...sCrd, borderLeft:`10px solid #64748B` }}>
                    <small style={{fontWeight:'900', opacity:0.6}}>CAPITAL EN ALMACÉN (COSTO)</small>
                    <h4 style={{fontSize:'2rem', margin:'10px 0'}}>S/ {auditoriaInvTotal.cost.toLocaleString('es-PE')}</h4>
                </div>
                <div style={{ ...sCrd, borderLeft:`10px solid ${AMARILLO_BJ}` }}>
                    <small style={{fontWeight:'900', opacity:0.6}}>CAJA TOTAL ACTUAL (DINERO EN MANO)</small>
                    <h4 style={{fontSize:'2rem', margin:'10px 0'}}>S/ {balanceFinancieroBunker.cajaGlobal.toFixed(2)}</h4>
                </div>
            </div>

            {/* FORMULARIOS DE REGISTRO */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '45px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
                <div style={sCrd}>
                  <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900', fontSize:'1.2rem' }}>💸 Movimiento de Caja Detallado</h4>
                  <form onSubmit={registrarGastoBunker} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                        <select value={formFinanzas.tipo} onChange={e => setFormFinanzas({...formFinanzas, tipo: e.target.value})} style={sInp}>
                            <option value="Gasto Local">🏪 Gasto Local</option>
                            <option value="Inversión (Mercadería)">📦 Inversión (Mercadería)</option>
                            <option value="Retiro Personal">🏧 Retiro Personal</option>
                            <option value="Ingreso Adicional">💰 Inyección Capital (No PE)</option>
                        </select>
                        <select value={formFinanzas.origen} onChange={e => setFormFinanzas({...formFinanzas, origen: e.target.value})} style={{...sInp, border:`2px solid ${AMARILLO_BJ}`}}>
                            <option value="Caja Global">De: Caja Global (Capital)</option>
                            <option value="Ganancias">De: Ganancias del Negocio</option>
                        </select>
                    </div>
                    <input placeholder="Descripción del movimiento..." value={formFinanzas.descripcion} onChange={e => setFormFinanzas({...formFinanzas, descripcion: e.target.value})} style={sInp} />
                    <input type="text" placeholder="Monto S/" value={formFinanzas.monto} onChange={e => setFormFinanzas({...formFinanzas, monto: handleInputMonto(e.target.value)})} style={sInp} />
                    <button type="submit" style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>GUARDAR REGISTRO</button>
                  </form>
                </div>
                <div style={{ ...sCrd, border: `3px solid ${FUCSIA_PRINCIPAL}` }}>
                  <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900', fontSize:'1.2rem' }}>🆕 Nuevo Producto al Catálogo</h4>
                  <form onSubmit={handleAddProductoCatalogo} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input placeholder="Nombre Modelo" value={formProd.nombre} onChange={e => setFormProd({...formProd, nombre: e.target.value})} style={sInp} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <input type="text" placeholder="Costo" value={formProd.precio_compra} onChange={e => setFormProd({...formProd, precio_compra: handleInputMonto(e.target.value)})} style={sInp} />
                        <input type="number" placeholder="Stock" value={formProd.stock} onChange={e => setFormProd({...formProd, stock: e.target.value})} style={sInp} />
                    </div>
                    <button type="submit" style={{ backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>CREAR PRODUCTO</button>
                  </form>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                <div style={sCrd}>
                  <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900', fontSize:'1.2rem' }}>🏆 PRODUCTOS MÁS RENTABLES</h4>
                  {analyticsMaster.ranking.map((p, i) => (
                    <div key={i} style={{display:'flex', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid #f1f1f1'}}>
                        <span>{i+1}. {p[0]}</span>
                        <strong style={{color:VERDE_BJ}}>+ S/ {p[1].toFixed(2)}</strong>
                    </div>
                  ))}
                </div>
                <div style={{...sCrd, borderLeft:`12px solid ${ROJO_BJ}`}}>
                    <h4 style={{margin:0, color:ROJO_BJ, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>💤 CAPITAL DORMIDO (+20 DÍAS)</h4>
                    {analyticsMaster.dormido.map((p, i) => (
                        <div key={i} style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                            <span>{p.nombre}</span>
                            <strong style={{color:ROJO_BJ}}>{p.stock} Und.</strong>
                        </div>
                    ))}
                </div>
              </div>
            </div>

            <div style={sCrd}>
                <h4 style={{ marginTop: 0, marginBottom: '30px', fontWeight: '900', fontSize: '1.4rem' }}>📖 Libro Diario Detallado</h4>
                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                        <tbody>
                        {finanzas.map(f => (
                            <tr key={f.id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                            <td style={{ padding: '20px 10px' }}>
                                <small style={{fontWeight:'900', color:'#64748B', display:'block'}}>{getFechaPeru(f.created_at)} | {getHoraPeru(f.created_at)}</small>
                                <small style={{fontWeight:'900', color:FUCSIA_PRINCIPAL, textTransform:'uppercase'}}>{f.tipo}</small>
                                <br/><span style={{ fontWeight: '600' }}>{f.descripcion}</span>
                                <br/><small style={{color: AMARILLO_BJ, fontWeight:'900'}}>Fondo: {f.origen || 'Caja Global'}</small>
                            </td>
                            <td style={{ textAlign: 'right', padding: '20px 10px', fontWeight: '900', fontSize: '17px', color: (f.tipo.includes('Ingreso')) ? VERDE_BJ : '#1E1B1C' }}>S/ {(Number(f.monto) || 0).toFixed(2)}</td>
                            <td style={{ textAlign: 'right', padding: '20px 10px' }}>
                                <button onClick={async ()=> { if(confirm("¿Borrar definitivamente?")) await supabase.from('finanzas').delete().eq('id', f.id); }} style={{background:'none', border:'none', color: FUCSIA_PRINCIPAL, cursor:'pointer', fontSize: '1.4rem'}}>🗑️</button>
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={sCrd}>
                <h4 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, marginBottom: '35px', fontWeight: '900', fontSize: '1.4rem' }}>📈 ROI / Retorno de Inversión</h4>
                <div style={{ height: '350px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={configChartROI} margin={{ top: 25, right: 30, left: -5, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="n" fontSize={13} fontWeight="900" axisLine={false} tickLine={false} dy={15} />
                            <YAxis fontSize={13} axisLine={false} tickLine={false} />
                            <Tooltip formatter={(v)=> `S/ ${v.toLocaleString()}`} contentStyle={{ borderRadius: '25px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', fontWeight: '900' }} />
                            <Bar dataKey="v" radius={[20, 20, 0, 0]} barSize={80}>
                                {configChartROI.map((entry, index) => ( <Cell key={`cell-${index}`} fill={entry.fill} /> ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}