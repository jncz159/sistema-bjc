"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, Cell 
} from 'recharts';

export default function SistemaBJCMasterFinal() {
  
  // ============================================================
  // [BLOQUE 1] SEGURIDAD Y HELPERS (ANTICRASH Y TIEMPO)
  // ============================================================

  // Garantiza que siempre tengamos una fecha válida para filtrar
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
    } catch (e) { return new Date().toISOString().split('T')[0]; }
  };

  // Formato de hora 12h para el historial de ventas y libro diario
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

  // Limpia inputs de precio para evitar errores de coma decimal
  const handleInputMonto = (valor) => {
    if (typeof valor !== 'string') return String(valor || '');
    let limpio = valor.replace(',', '.');
    return limpio.replace(/[^0-9.]/g, '');
  };

  // Genera etiquetas visuales para el catálogo
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
  
  // Filtros de búsqueda
  const [busqueda, setBusqueda] = useState(''); 
  const [busquedaStock, setBusquedaStock] = useState(''); 
  const [fechaConsulta, setFechaConsulta] = useState(getFechaPeru());
  
  // Estado de la venta actual
  const [cliente, setCliente] = useState('');
  const [localidad, setLocalidad] = useState(''); 
  const [telefono, setTelefono] = useState(''); 
  const [tipoVenta, setTipoVenta] = useState('Mayor'); 
  const [cantidades, setCantidades] = useState({});
  const [coloresElegidos, setColoresElegidos] = useState({});
  const [carrito, setCarrito] = useState([]);
  const [descuento, setDescuento] = useState(0); 

  // Estados para correcciones y ediciones
  const [editandoGrupoId, setEditandoGrupoId] = useState(null); 
  const [formEditCliente, setFormEditCliente] = useState({ nombre: '', localidad: '', telefono: '' });
  const [idItemVentaEditando, setIdItemVentaEditando] = useState(null); 
  const [nuevaCantVenta, setNuevaCantVenta] = useState(0);
  
  const [idFinanzaEditando, setIdFinanzaEditando] = useState(null);
  const [formEditFinanza, setFormEditFinanza] = useState({ tipo: '', descripcion: '', monto: '' });
  const [formProd, setFormProd] = useState({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
  const [formFinanzas, setFormFinanzas] = useState({ tipo: 'Gasto Local', descripcion: '', monto: '' });
  const [formEditStock, setFormEditStock] = useState({}); 

  const FUCSIA_PRINCIPAL = '#F786C1';
  const VERDE_EXITO = '#16A34A';
  const ROJO_ALERTA = '#E11D48';
  const AMARILLO_AVISO = '#CA8A04';

  // ============================================================
  // [BLOQUE 3] NÚCLEO DE DATOS (DB & REALTIME)
  // ============================================================

  useEffect(() => {
    const inicializar = async () => { await cargarTodo(); setCargando(false); };
    inicializar();

    // Sincronización automática de 3 vías
    const canalV = supabase.channel('v41-v').on('postgres_changes',{event:'*',schema:'public',table:'ventas'},()=>cargarTodo()).subscribe();
    const canalP = supabase.channel('v41-p').on('postgres_changes',{event:'*',schema:'public',table:'productos'},()=>cargarTodo()).subscribe();
    const canalF = supabase.channel('v41-f').on('postgres_changes',{event:'*',schema:'public',table:'finanzas'},()=>cargarTodo()).subscribe();

    return () => {
      supabase.removeChannel(canalV); supabase.removeChannel(canalP); supabase.removeChannel(canalF);
    };
  }, []);

  const cargarTodo = async () => {
    try {
        const { data: p } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
        const { data: v } = await supabase.from('ventas').select('*').order('created_at', { ascending: true });
        const { data: f } = await supabase.from('finanzas').select('*').order('created_at', { ascending: false });
        if (p) setProductos(p); if (v) setVentas(v); if (f) setFinanzas(f);
    } catch (err) { console.error("Error de sincronización:", err); }
  };

  // ============================================================
  // [BLOQUE 4] INTELIGENCIA Y CÁLCULOS (USEMEMO BLINDADOS)
  // ============================================================

  // 1. LOGÍSTICA: Separa Cuentas por Cobrar de Mercadería en Almacén
  const logisticaInteligente = useMemo(() => {
    if (!ventas || ventas.length === 0) return { almacen: [], cuentasPorCobrar: [] };
    const gAlmacen = {}; const gCuentas = {};

    ventas.forEach(v => {
        const llave = `${v.cliente_nombre}-${v.localidad}`;
        if (v.estado_pedido === 'En Almacén') {
            if (!gAlmacen[llave]) gAlmacen[llave] = { cliente: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, items: [], total: 0 };
            gAlmacen[llave].items.push(v);
            gAlmacen[llave].total += (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0));
        }
        if (v.estado_pedido === 'Pendiente de Pago') {
            if (!gCuentas[llave]) gCuentas[llave] = { cliente: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, items: [], total: 0 };
            gCuentas[llave].items.push(v);
            gCuentas[llave].total += (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0));
        }
    });
    return { almacen: Object.values(gAlmacen), cuentasPorCobrar: Object.values(gCuentas) };
  }, [ventas]);

  // 2. HISTORIAL: Agrupa ventas del día seleccionado
  const historialVentasHoy = useMemo(() => {
    if (!ventas || ventas.length === 0) return [];
    try {
        const filtradas = ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta);
        const grupos = {};
        filtradas.forEach(v => {
            const horaKey = (v.created_at || "").substring(0,16);
            const llave = `${v.cliente_nombre || 'SN'}-${v.localidad || 'SZ'}-${horaKey}`; 
            if (!grupos[llave]) {
                grupos[llave] = { id_grupo: llave, cliente_nombre: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, hora: getHoraPeru(v.created_at), total: 0, items: [] };
            }
            grupos[llave].items.push(v);
            grupos[llave].total += (Number(v.precio_venta_unitario ?? 0) * Number(v.cantidad ?? 0));
        });
        return Object.values(grupos).reverse();
    } catch (e) { return []; }
  }, [ventas, fechaConsulta]);

  // 3. BALANCE CAJA REAL: Excluye lo que no se ha pagado aún
  const balanceGeneral = useMemo(() => {
    try {
        const fList = finanzas || [];
        const vList = ventas || [];
        const hoy = getFechaPeru();
        const vHoy = vList.filter(v => getFechaPeru(v.created_at) === hoy && v.estado_pedido !== 'Pendiente de Pago');
        
        const eg = fList.filter(f => ['Gasto Local','Inversión (Mercadería)','Retiro Personal'].includes(f.tipo)).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
        const ex = fList.filter(f => ['Ingreso Adicional','Inversión Inicial'].includes(f.tipo)).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
        const vB = vList.filter(v => v.estado_pedido !== 'Pendiente de Pago').reduce((acc, v) => acc + (Number(v.precio_venta_unitario ?? 0) * Number(v.cantidad ?? 0)), 0);
        const ganReal = vList.reduce((acc, v) => acc + (Number(v.ganancia_total) || 0), 0);
        
        return { 
            cajaHoy: vHoy.reduce((acc, v) => acc + (Number(v.precio_venta_unitario ?? 0) * Number(v.cantidad ?? 0)), 0),
            ganHoy: vHoy.reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0),
            efectivoCaja: (vB + ex - eg),
            egresosTotales: eg, ingresosExtras: ex, gananciaTotalAcumulada: ganReal
        };
    } catch (e) { return { cajaHoy: 0, ganHoy: 0, efectivoEnCaja: 0, egresosTotales: 0, ingresosExtras: 0, gananciaTotalAcumulada: 0 }; }
  }, [finanzas, ventas]);

  // 4. ANALÍTICA AVANZADA: Ranking, Stock Dormido y Punto de Equilibrio
  const analyticsBJ = useMemo(() => {
    // Top 5 Ganancia
    const prof = {};
    (ventas || []).forEach(v => {
        const nom = productos.find(p => p.id === v.producto_id)?.nombre || "Modelo Borrado";
        prof[nom] = (prof[nom] || 0) + Number(v.ganancia_total || 0);
    });
    const ranking = Object.entries(prof).sort((a,b) => b[1] - a[1]).slice(0, 5);

    // Stock Dormido (+20 días sin ventas)
    const hoy = new Date();
    const dormido = (productos || []).filter(p => {
        const ultimaVenta = (ventas || []).filter(v => v.producto_id === p.id).pop();
        if (!ultimaVenta) return true;
        const diff = Math.floor((hoy - new Date(ultimaVenta.created_at)) / (1000 * 60 * 60 * 24));
        return diff > 20 && p.stock > 0;
    }).slice(0, 5);

    // Punto de Equilibrio Mensual
    const mesActual = getFechaPeru().substring(0,7);
    const egMes = (finanzas || []).filter(f => getFechaPeru(f.created_at).substring(0,7) === mesActual && ['Gasto Local','Retiro Personal'].includes(f.tipo)).reduce((a,b) => a + Number(b.monto || 0), 0);
    const venMes = (ventas || []).filter(v => getFechaPeru(v.created_at).substring(0,7) === mesActual && v.estado_pedido !== 'Pendiente de Pago').reduce((a,b) => a + (Number(b.precio_venta_unitario || 0) * Number(b.cantidad || 0)), 0);
    const progresoPE = egMes > 0 ? (venMes / egMes) * 100 : 0;

    return { ranking, dormido, egMes, venMes, progresoPE };
  }, [ventas, productos, finanzas]);

  const auditoriaInv = useMemo(() => {
    let cost = 0; let vent = 0;
    (productos || []).forEach(p => { 
        const st = Number(p.stock || 0);
        if (st > 0) { cost += (Number(p.precio_compra || 0) * st); vent += (Number(p.precio_venta || 0) * st); } 
    });
    return { cost, vent, util: vent - cost };
  }, [productos]);

  const chartDataInversion = [
    { n: 'Inversión Real', v: auditoriaInv.cost || 0, fill: '#1E1B1C' },
    { n: 'Venta Potencial', v: auditoriaInv.vent || 0, fill: FUCSIA_PRINCIPAL }
  ];

  // ============================================================
  // [BLOQUE 5] FUNCIONES DE ACCIÓN (HANDLERS)
  // ============================================================

  const handleClienteAuto = (e) => {
    const val = e.target.value; setCliente(val);
    const match = (ventas || []).find(v => v.cliente_nombre?.toLowerCase() === val.toLowerCase());
    if (match) { setLocalidad(match.localidad || ''); setTelefono(match.telefono || ''); }
  };

  const handleAddAlCarrito = (p) => {
    const c = Number(cantidades[p.id] || 1);
    const pb = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
    const ya = carrito.filter(i => i.producto_id === p.id).reduce((acc, i) => acc + i.cantidad, 0);
    if ((Number(p.stock) || 0) < c + ya) return alert("¡Atención! No hay suficiente stock físico.");
    setCarrito([...carrito, { producto_id: p.id, nombre: p.nombre, cantidad: c, color: (coloresElegidos[p.id] || "Único"), precio_venta: pb, precio_compra: p.precio_compra }]);
  };

  const handleWhatsAppTicket = (grupo) => {
    let msg = `¡Hola *${grupo.cliente_nombre}*! 👋 Recibo de compra de *B J Importaciones*.%0A%0A`;
    grupo.items.forEach(v => {
        const prod = productos.find(p => p.id === v.producto_id);
        msg += `- *${v.cantidad}x* ${prod?.nombre || 'Producto'} (${v.color}): S/ ${(v.precio_venta_unitario * v.cantidad).toFixed(2)}%0A`;
    });
    msg += `%0A*TOTAL PAGADO: S/ ${grupo.total.toFixed(2)}*%0A¡Muchas gracias por elegirnos! 😊✨`;
    window.open(`https://wa.me/51${grupo.telefono?.replace(/\D/g,'')}?text=${msg}`, '_blank');
  };

  const handleEjecutarVentaFinal = async (estado = 'Entregado') => {
    if (!cliente || !localidad) return alert("Por favor completa los datos del cliente.");
    if (carrito.length === 0) return alert("El carrito está vacío.");
    const totV = carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0);
    const rD = totV > 0 ? (Number(descuento) / totV) : 0;
    const items = carrito.map(i => {
        const pv = Number(i.precio_venta);
        return { cliente_nombre: cliente, localidad, telefono: telefono || '', producto_id: i.producto_id, cantidad: i.cantidad, color: i.color, precio_venta_unitario: pv, precio_costo_unitario: Number(i.precio_compra ?? 0), ganancia_total: ((pv - Number(i.precio_compra ?? 0)) * i.cantidad) - ((pv * i.cantidad) * rD), estado_pedido: estado };
    });
    const { error } = await supabase.from('ventas').insert(items);
    if (!error) {
      for (const item of carrito) {
        const pO = productos.find(p => p.id === item.producto_id);
        if (pO) await supabase.from('productos').update({ stock: pO.stock - item.cantidad }).eq('id', item.producto_id);
      }
      setCliente(''); setLocalidad(''); setTelefono(''); setCarrito([]); setDescuento(0);
      alert("✅ Venta registrada correctamente.");
    }
  };

  const handleCobrarCredito = async (grupo) => {
    if(confirm(`¿Registrar el pago de S/ ${grupo.total.toFixed(2)} del cliente ${grupo.cliente}?`)) {
        for(let item of grupo.items) { await supabase.from('ventas').update({ estado_pedido: 'Entregado' }).eq('id', item.id); }
        alert("💰 Pago recibido. Se ha sumado a la caja de hoy.");
    }
  };

  const handleCorregirCantVenta = async (v) => {
    const diff = nuevaCantVenta - v.cantidad;
    const pRef = productos.find(p => p.id === v.producto_id);
    if (pRef && pRef.stock < diff) return alert("Sin stock suficiente para aumentar.");
    const { error } = await supabase.from('ventas').update({ cantidad: nuevaCantVenta, ganancia_total: (v.precio_venta_unitario - v.precio_costo_unitario) * nuevaCantVenta }).eq('id', v.id);
    if (!error) {
        if (pRef) await supabase.from('productos').update({ stock: (pRef.stock - diff) }).eq('id', pRef.id);
        setIdItemVentaEditando(null); alert("✅ Cantidad corregida.");
    }
  };

  const handleAnularVentaTotal = async (v) => {
    if (confirm("¿Anular este ítem? El stock volverá al catálogo.")) {
      const pc = productos.find(pr => pr.id === v.producto_id);
      if (pc) await supabase.from('productos').update({ stock: pc.stock + v.cantidad }).eq('id', pc.id);
      await supabase.from('ventas').delete().eq('id', v.id);
    }
  };

  const handleAddProductoDB = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('productos').insert([{
        nombre: formProd.nombre, precio_compra: Number(handleInputMonto(formProd.precio_compra)),
        precio_venta: Number(handleInputMonto(formProd.precio_venta)), precio_menor: Number(handleInputMonto(formProd.precio_menor)),
        stock: Number(formProd.stock), colores: formProd.colores
    }]);
    if (!error) { setFormProd({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' }); alert("✨ Modelo creado."); }
  };

  const handleSyncStock = async (p) => {
    const ns = formEditStock[p.id] !== undefined ? formEditStock[p.id] : p.stock;
    await supabase.from('productos').update({ stock: ns }).eq('id', p.id); alert("✅ Sincronizado.");
  };

  const handleRegistrarGastoDB = async (e) => {
    e.preventDefault();
    const cm = handleInputMonto(formFinanzas.monto);
    await supabase.from('finanzas').insert([{...formFinanzas, monto: Number(cm)}]);
    setFormFinanzas({tipo:'Gasto Local', descripcion:'', monto:''}); alert("✅ Movimiento guardado.");
  };

  const handleUpdateLibroDB = async () => {
    const ml = handleInputMonto(String(formEditFinanza.monto));
    await supabase.from('finanzas').update({ tipo: formEditFinanza.tipo, descripcion: formEditFinanza.descripcion, monto: Number(ml) }).eq('id', idFinanzaEditando);
    setIdFinanzaEditando(null); alert("✅ Movimiento actualizado.");
  };

  const handleExportarExcelCaja = () => {
    let csv = "data:text/csv;charset=utf-8,Fecha,Hora,Cliente,Zona,Producto,Cant,Precio,Total\n";
    ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta).forEach(v => {
      const np = productos.find(p=>p.id===v.producto_id)?.nombre || "Ítem";
      csv += `${getFechaPeru(v.created_at)},${getHoraPeru(v.created_at)},${v.cliente_nombre},${v.localidad},${np},${v.cantidad},${v.precio_venta_unitario},${(v.precio_venta_unitario*v.cantidad).toFixed(2)}\n`;
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `Cierre_BJ_${fechaConsulta}.csv`);
    document.body.appendChild(link); link.click();
  };

  // ============================================================
  // [BLOQUE 6] INTERFAZ DE USUARIO (VISUAL UI)
  // ============================================================

  const bjInput = { padding: '16px', borderRadius: '16px', border: `2px solid #FCC2E2`, width: '100%', outline: 'none', fontSize: '15px', boxSizing: 'border-box', backgroundColor: '#fff', transition: '0.3s' };
  const bjCard = { backgroundColor: '#ffffff', borderRadius: '35px', padding: '35px', boxShadow: `0 20px 40px rgba(247, 134, 193, 0.15)`, border: '1px solid #FFF1F2' };

  if (cargando) return <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', backgroundColor:'#FFF5F7', fontWeight:'bold', color:FUCSIA_PRINCIPAL, fontSize:'1.5rem' }}>INICIANDO BJ BUNKER v41... 💎🚀</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF5F7', color: '#1E1B1C', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* 🚀 NAVBAR PRINCIPAL */}
      <header style={{ backgroundColor: '#ffffff', padding: '20px 5%', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 4px 10px rgba(0,0,0,0.05)`, flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.4rem' }}>BJ</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>B J IMPORTACIONES</h1>
            <small style={{ color: '#64748B', fontWeight: '900', fontSize: '10px', textTransform:'uppercase' }}>CHICLAYO • BUNKER v41</small>
          </div>
        </div>
        <nav style={{ display: 'flex', gap: '10px', backgroundColor: `#FCA5D415`, padding: '6px', borderRadius: '18px' }}>
          <button onClick={() => setVista('ventas')} style={{ backgroundColor: vista === 'ventas' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'ventas' ? '#fff' : FUCSIA_PRINCIPAL, padding: '12px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900', transition: '0.3s' }}>VENTAS</button>
          <button onClick={() => setVista('logistica')} style={{ backgroundColor: vista === 'logistica' ? '#1E1B1C' : 'transparent', border: 'none', color: vista === 'logistica' ? '#fff' : '#1E1B1C', padding: '12px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900', transition: '0.3s' }}>LOGÍSTICA</button>
          <button onClick={() => setVista('contabilidad')} style={{ backgroundColor: vista === 'contabilidad' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'contabilidad' ? '#fff' : FUCSIA_PRINCIPAL, padding: '12px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900', transition: '0.3s' }}>GESTIÓN</button>
        </nav>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '30px 20px' }}>
        
        {/* ===================== [TAB VENTAS] ===================== */}
        {vista === 'ventas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
              <div style={bjCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>💰 CAJA EFECTIVO HOY</span>
                  <button onClick={handleExportarExcelCaja} style={{ backgroundColor: `#FCA5D430`, border: 'none', padding: '10px 18px', borderRadius: '12px', color: FUCSIA_PRINCIPAL, cursor: 'pointer', fontWeight: '900', fontSize: '10px' }}>RESPALDO EXCEL</button>
                </div>
                <h2 style={{ margin: '15px 0', fontSize: '3.5rem', fontWeight: '900' }}>S/ {balanceGeneral.cajaHoy.toFixed(2)}</h2>
                <div style={{ color: '#16A34A', fontWeight: '900', fontSize: '15px', backgroundColor: '#F0FDF4', padding: '8px 15px', borderRadius: '12px', display: 'inline-block' }}>Ganancia Día: S/ {balanceGeneral.ganHoy.toFixed(2)}</div>
              </div>
              <div style={bjCard}>
                <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>📅 BUSCAR HISTORIAL</span>
                <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...bjInput, marginTop: '15px' }} />
              </div>
            </div>

            <div style={{ ...bjCard, border: `3px solid #FCA5D4` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontWeight: '900' }}>🛒 Registrar Nuevo Pedido</h3>
                <div style={{ display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '18px', padding: '6px' }}>
                  <button onClick={() => setTipoVenta('Mayor')} style={{ border: 'none', padding: '10px 22px', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: '900', backgroundColor: tipoVenta === 'Mayor' ? FUCSIA_PRINCIPAL : 'transparent', color: tipoVenta === 'Mayor' ? '#fff' : '#64748B' }}>MAYOR</button>
                  <button onClick={() => setTipoVenta('Menor')} style={{ border: 'none', padding: '10px 22px', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: '900', backgroundColor: tipoVenta === 'Menor' ? '#1E1B1C' : 'transparent', color: tipoVenta === 'Menor' ? '#fff' : '#64748B' }}>MINORISTA</button>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '30px' }}>
                <input list="cli_list" placeholder="👤 Cliente" value={cliente} onChange={handleClienteAuto} style={bjInput} />
                <datalist id="cli_list">{[...new Set(ventas.map(v => v.cliente_nombre))].map((c, i) => <option key={i} value={c} />)}</datalist>
                <input placeholder="📱 WhatsApp" value={telefono} onChange={e => setTelefono(e.target.value)} style={bjInput} />
                <input placeholder="📍 Zona" value={localidad} onChange={e => setLocalidad(e.target.value)} style={bjInput} />
              </div>

              {carrito.length > 0 && (
                <div style={{ backgroundColor: '#FFF9FB', border: `3px dashed ${FUCSIA_PRINCIPAL}`, borderRadius: '25px', padding: '30px', marginBottom: '40px' }}>
                  {carrito.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #FCC2E2', paddingBottom: '15px', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}><strong>{item.cantidad}x</strong> {item.nombre} <br/><small style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900' }}>COLOR: {item.color}</small></div>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#fff', padding: '6px 12px', borderRadius: '12px', border: '2px solid #FCA5D4' }}>
                           <span style={{ fontSize: '14px', fontWeight: '900' }}>S/</span>
                           <input type="text" value={item.precio_venta} onChange={(e) => { const n = [...carrito]; n[idx].precio_venta = handleInputMonto(e.target.value); setCarrito(n); }} style={{ width: '80px', border: 'none', outline: 'none', textAlign: 'center', fontSize: '17px', fontWeight: '900' }} />
                        </div>
                        <button onClick={() => { const n = [...carrito]; n.splice(idx, 1); setCarrito(n); }} style={{ color: '#fff', backgroundColor: FUCSIA_PRINCIPAL, border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer' }}>X</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ textAlign: 'right', marginTop: '30px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '900' }}>DESCUENTO: S/ </span>
                    <input type="text" value={descuento} onChange={e=>setDescuento(handleInputMonto(e.target.value))} style={{ width: '130px', padding: '12px', borderRadius: '15px', border: `2px solid ${FUCSIA_PRINCIPAL}`, textAlign: 'center', fontWeight: '900', fontSize:'20px' }} />
                    <h3 style={{ margin: '10px 0', fontSize: '2.8rem', fontWeight: '900' }}>TOTAL: S/ {(carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0) - Number(descuento)).toFixed(2)}</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '20px' }}>
                    <button onClick={() => handleEjecutarVentaFinal('Entregado')} style={{ backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '22px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '14px' }}>✅ PAGAR Y ENTREGAR</button>
                    <button onClick={() => handleEjecutarVentaFinal('En Almacén')} style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '22px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '14px' }}>📦 PAGAR Y ALMACENAR</button>
                    <button onClick={() => handleEjecutarVentaFinal('Pendiente de Pago')} style={{ backgroundColor: AMARILLO_AVISO, color: '#fff', border: 'none', padding: '22px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '14px' }}>💸 DAR A PAGAR (CRÉDITO)</button>
                  </div>
                </div>
              )}

              <input placeholder="🔍 Buscar modelo para vender..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...bjInput, marginBottom: '25px', height: '65px', fontSize: '18px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '25px', maxHeight: '750px', overflowY: 'auto' }}>
                {productos.filter(p => p.nombre?.toLowerCase().includes(busqueda.toLowerCase())).map((p) => {
                  const tag = getEtiquetaProducto(p.created_at);
                  const pAMostrar = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
                  return (
                    <div key={p.id} style={{ border: '1px solid #FFF1F2', padding: '22px', borderRadius: '35px', backgroundColor: '#fff', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
                      {tag && <span style={{ position:'absolute', top: '-15px', left: '20px', backgroundColor: tag.color, color: '#fff', fontSize: '10px', padding: '6px 15px', borderRadius: '15px', fontWeight: '900', zIndex: 10 }}>{tag.tipo}</span>}
                      <strong style={{ display: 'block', height: '45px', overflow: 'hidden', fontSize: '16px' }}>{p.nombre}</strong>
                      <div style={{ margin: '12px 0', padding: '10px', backgroundColor: p.stock < 5 ? '#FFF1F2' : '#F0FDF4', borderRadius: '18px', textAlign: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: '900', color: p.stock < 5 ? '#E11D48' : '#16A34A' }}>STOCK: {p.stock}</span>
                      </div>
                      <select value={coloresElegidos[p.id]} onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{ ...bjInput, padding: '10px', fontSize: '14px', marginBottom: '18px', height: '50px' }}>
                        {p.colores?.split(',').map(c => <option key={c} value={c.trim()}>{c.trim()}</option>)}
                      </select>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '18px', marginBottom: '22px', alignItems: 'center' }}>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.max(1, (cantidades[p.id] || 1) - 1)})} style={{ border: 'none', background: '#f5f5f5', borderRadius: '12px', width: '48px', height: '48px', cursor:'pointer' }}>-</button>
                        <span style={{ fontWeight: '900', fontSize: '22px', paddingTop:'8px' }}>{cantidades[p.id] || 1}</span>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.min(p.stock, (cantidades[p.id] || 1) + 1)})} style={{ border: 'none', background: '#f5f5f5', borderRadius: '12px', width: '48px', height: '48px', cursor:'pointer' }}>+</button>
                      </div>
                      <button onClick={() => handleAddAlCarrito(p)} disabled={p.stock <= 0} style={{ width: '100%', backgroundColor: tipoVenta === 'Mayor' ? '#1E1B1C' : '#A13C6D', color: '#fff', border: 'none', padding: '18px', borderRadius: '22px', fontSize: '14px', fontWeight: '900', cursor:'pointer' }}>
                        {p.stock > 0 ? `VENDER S/ ${Number(pAMostrar).toFixed(2)}` : 'AGOTADO'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* HISTORIAL COMPLETO */}
            <div style={bjCard}>
              <h4 style={{ margin: 0, marginBottom: '35px', color: '#64748B', fontSize: '15px', fontWeight: '900', textTransform:'uppercase' }}>📜 Ventas del Día Seleccionado</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {historialVentasHoy.map(grupo => (
                  <div key={grupo.id_grupo} style={{ padding: '30px', backgroundColor: '#FFF5F7', borderRadius: '35px', border: `1px solid #FCC2E2` }}>
                    {editandoGrupoId === grupo.id_grupo ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px', backgroundColor:'#fff', padding:'25px', borderRadius:'25px', border: `2px solid ${FUCSIA_PRINCIPAL}` }}>
                         <input value={formEditCliente.nombre} onChange={e=>setFormEditCliente({...formEditCliente, nombre: e.target.value})} style={bjInput} />
                         <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
                            <input value={formEditCliente.localidad} onChange={e=>setFormEditCliente({...formEditCliente, localidad: e.target.value})} style={bjInput} />
                            <input value={formEditCliente.telefono} onChange={e=>setFormEditCliente({...formEditCliente, telefono: e.target.value})} style={bjInput} />
                         </div>
                         <div style={{ display:'flex', gap:'15px', marginTop:'10px' }}>
                            <button onClick={() => guardarCambiosCli(grupo)} style={{ backgroundColor:'#16A34A', color:'#fff', padding:'18px', borderRadius:'15px', flex:2, fontWeight:'900', cursor:'pointer' }}>GUARDAR CAMBIOS</button>
                            <button onClick={() => setEditandoGrupoId(null)} style={{ backgroundColor:'#64748B', color:'#fff', padding:'18px', borderRadius:'15px', fontWeight:'900', cursor:'pointer' }}>X</button>
                         </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                        <div>
                          <small style={{ fontWeight:'900', color: FUCSIA_PRINCIPAL, textTransform:'uppercase' }}>⏰ Venta: {grupo.hora}</small>
                          <br/><strong style={{ color: '#1E1B1C', fontSize: '24px', fontWeight: '900' }}>{grupo.cliente_nombre}</strong>
                          <br/><small style={{ fontWeight: '900', color: '#64748B' }}>📍 {grupo.localidad} | 📱 {grupo.telefono}</small>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                           <div style={{ backgroundColor: '#16A34A', color: '#fff', padding: '10px 22px', borderRadius: '16px', fontWeight: '900', fontSize: '18px' }}>S/ {grupo.total.toFixed(2)}</div>
                           <button onClick={() => handleWhatsAppTicket(grupo)} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '12px 18px', borderRadius: '15px', cursor:'pointer', fontWeight:'900', fontSize:'13px' }}>TICKET 📱</button>
                           <button onClick={() => prepararEdicionCliente(grupo)} style={{ border:'none', background:'#fff', padding:'12px', borderRadius:'15px', cursor:'pointer', border:'2px solid #FCC2E2' }}>✏️</button>
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {grupo.items.map(v => (
                        <div key={v.id} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 5px 12px rgba(0,0,0,0.02)' }}>
                            <div style={{ fontSize: '16px' }}>
                                {idItemVentaEditando === v.id ? (
                                    <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
                                        <input type="number" value={nuevaCantVenta} onChange={e=>setNuevaCantVenta(Number(e.target.value))} style={{ width:'80px', padding:'10px', borderRadius:'12px', border:'2px solid #FCA5D4', fontWeight:'900' }} />
                                        <button onClick={() => handleCorregirCantVenta(v)} style={{ background:'#16A34A', color:'#fff', padding:'10px 20px', borderRadius:'12px', fontWeight:'900', border:'none', cursor:'pointer' }}>OK</button>
                                        <button onClick={() => setIdItemVentaEditando(null)} style={{ background:'#64748B', color:'#fff', padding:'10px 20px', borderRadius:'12px', fontWeight:'900', border:'none', cursor:'pointer' }}>X</button>
                                    </div>
                                ) : (
                                    <>
                                        <strong>{v.cantidad}x</strong> {productos.find(p => p.id === v.producto_id)?.nombre || 'Ítem'}<br/>
                                        <small style={{ fontWeight:'900', color: FUCSIA_PRINCIPAL }}>{v.color} | {v.estado_pedido==='En Almacén' ? '📦 ALMACÉN' : v.estado_pedido==='Pendiente de Pago' ? '💸 CRÉDITO' : '✅ OK'}</small>
                                        <button onClick={() => { setIdItemVentaEditando(v.id); setNuevaCantVenta(v.cantidad); }} style={{ background:'none', border:'none', color:'#64748B', fontSize:'11px', textDecoration:'underline', cursor:'pointer', marginLeft:'12px', fontWeight:'bold' }}>Editar Cantidad</button>
                                    </>
                                )}
                            </div>
                            <div style={{ display:'flex', gap:'25px', alignItems:'center' }}>
                                <span style={{ fontWeight: '900', fontSize: '20px' }}>S/ {(v.precio_venta_unitario * v.cantidad).toFixed(2)}</span>
                                <button onClick={() => handleAnularVentaTotal(v)} style={{ border:'none', background:'none', color: FUCSIA_PRINCIPAL, cursor:'pointer', fontSize: '26px' }}>🗑️</button>
                            </div>
                        </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================== [TAB LOGÍSTICA] ===================== */}
        {vista === 'logistica' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            <div style={{ ...bjCard, backgroundColor: '#1E1B1C', color: '#fff', padding: '60px', textAlign: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '3rem', fontWeight: '900' }}>📦 Centro de Entregas y Cobros</h2>
                <p style={{ opacity: 0.7, fontSize: '20px', marginTop:'15px' }}>Gestiona productos en almacén y saldos pendientes.</p>
            </div>
            
            {/* ALMACÉN */}
            <div style={bjCard}>
                <h3 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', color: FUCSIA_PRINCIPAL, marginBottom:'25px' }}>📦 Mercadería Pagada en Almacén</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {logisticaInteligente.almacen.map((grupo, idx) => (
                        <div key={idx} style={{ padding: '25px', border: '1px solid #f1f1f1', borderRadius: '25px' }}>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
                                <div><strong>{grupo.cliente}</strong><br/><small>{grupo.localidad}</small></div>
                                <button onClick={() => { let m = `¡Hola *${grupo.cliente}*! 👋 Tu pedido en BJ Importaciones ya está listo. ✨📦`; window.open(`https://wa.me/51${grupo.telefono?.replace(/\D/g,'')}?text=${m}`, '_blank'); }} style={{ background:'#25D366', color:'#fff', border:'none', padding:'10px 15px', borderRadius:'12px', fontWeight:'900', cursor:'pointer' }}>AVISAR 📱</button>
                            </div>
                            <div style={{margin:'15px 0', borderTop:'1px solid #eee', paddingTop:'10px'}}>{grupo.items.map((it,i) => <div key={i}><small>{it.cantidad}x {it.color} ({it.precio_venta_unitario})</small></div>)}</div>
                            <button onClick={async () => { if(confirm("¿Entregaste el pedido?")) { for(let i of grupo.items) await supabase.from('ventas').update({estado_pedido:'Entregado'}).eq('id', i.id); alert("✅ Entregado!"); } }} style={{ width: '100%', backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: '900', cursor:'pointer' }}>MARCAR ENTREGADO ✅</button>
                        </div>
                    ))}
                </div>
            </div>

            {/* CUENTAS POR COBRAR */}
            <div style={{ ...bjCard, borderLeft: `15px solid ${AMARILLO_AVISO}` }}>
                <h3 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', color: AMARILLO_AVISO, marginBottom:'25px' }}>💸 Cuentas por Cobrar (Ventas a Crédito)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {logisticaInteligente.cuentasPorCobrar.map((grupo, idx) => (
                        <div key={idx} style={{ padding: '25px', backgroundColor: '#FFFBEB', borderRadius: '25px', border:`2px solid ${AMARILLO_AVISO}30` }}>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
                                <div><strong>{grupo.cliente}</strong><br/><small>{grupo.localidad}</small></div>
                                <button onClick={() => { let m = `Hola *${grupo.cliente}* 👋 Te escribimos de BJ Importaciones para recordarte el saldo pendiente de S/ ${grupo.total.toFixed(2)}. ✨`; window.open(`https://wa.me/51${grupo.telefono?.replace(/\D/g,'')}?text=${m}`, '_blank'); }} style={{ background:AMARILLO_AVISO, color:'#fff', border:'none', padding:'10px 15px', borderRadius:'12px', fontWeight:'900', cursor:'pointer' }}>RECORDAR 📱</button>
                            </div>
                            <h4 style={{color:AMARILLO_AVISO, margin:'10px 0'}}>SALDO DEUDOR: S/ {grupo.total.toFixed(2)}</h4>
                            <button onClick={() => handleCobrarCredito(grupo)} style={{ width: '100%', backgroundColor: VERDE_EXITO, color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: '900', cursor:'pointer' }}>💰 REGISTRAR PAGO TOTAL</button>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        )}

        {/* ===================== [TAB GESTIÓN] ===================== */}
        {vista === 'contabilidad' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
            
            {/* PANEL DE INTELIGENCIA ESTRATÉGICA */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
                
                {/* 1. Punto de Equilibrio Mensual */}
                <div style={bjCard}>
                    <h4 style={{margin:0, color:FUCSIA_PRINCIPAL, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>🏁 PUNTO DE EQUILIBRIO (MES)</h4>
                    <div style={{height:'15px', width:'100%', backgroundColor:'#F1F5F9', borderRadius:'10px', overflow:'hidden', marginBottom:'15px'}}>
                        <div style={{height:'100%', width:`${analyticsBJ.progresoPE}%`, backgroundColor:VERDE_EXITO, transition:'1s'}}></div>
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'13px'}}>
                        <span>Mes: S/ {analyticsBJ.venMes.toFixed(2)}</span>
                        <strong>Meta: S/ {analyticsBJ.egMes.toFixed(2)}</strong>
                    </div>
                    <small style={{display:'block', marginTop:'10px', color: analyticsBJ.progresoPE >= 100 ? VERDE_EXITO : ROJO_ALERTA, fontWeight:'900'}}>
                        {analyticsBJ.progresoPE >= 100 ? "🎉 Meta superada. ¡Todo es ganancia!" : `⚠️ Faltan S/ ${(analyticsBJ.egMes - analyticsBJ.venMes).toFixed(2)} para no perder.`}
                    </small>
                </div>

                {/* 2. Top 5 Rentabilidad */}
                <div style={bjCard}>
                    <h4 style={{margin:0, color:FUCSIA_PRINCIPAL, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>🏆 TOP 5 MODELOS RENTABLES</h4>
                    {analyticsBJ.ranking.map((p, i) => (
                        <div key={i} style={{display:'flex', justifyContent:'space-between', marginBottom:'8px', fontSize:'13px'}}>
                            <span>{i+1}. {p[0]}</span>
                            <strong style={{color:VERDE_EXITO}}>+ S/ {p[1].toFixed(2)}</strong>
                        </div>
                    ))}
                </div>

                {/* 3. Dinero Estancado */}
                <div style={{...bjCard, borderLeft:`12px solid ${ROJO_ALERTA}`}}>
                    <h4 style={{margin:0, color:ROJO_ALERTA, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>💤 STOCK DORMIDO (+20 DÍAS)</h4>
                    {analyticsBJ.dormido.map((p, i) => (
                        <div key={i} style={{display:'flex', justifyContent:'space-between', marginBottom:'8px', fontSize:'13px'}}>
                            <span>{p.nombre}</span>
                            <strong style={{color:ROJO_ALERTA}}>{p.stock} Und.</strong>
                        </div>
                    ))}
                    <small style={{display:'block', marginTop:'10px', fontStyle:'italic'}}>Lanza ofertas flash para mover este capital.</small>
                </div>
            </div>

            {/* AUDITORÍA DE INVERSIÓN */}
            <div style={{ ...bjCard, border: `4px solid ${FUCSIA_PRINCIPAL}` }}>
                <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, marginBottom: '35px', fontWeight: '900', fontSize:'1.8rem' }}>📊 Auditoría de Capital Total</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '35px' }}>
                    <div style={{ backgroundColor: '#F8FAFC', padding: '35px', borderRadius: '35px' }}>
                        <small style={{ fontWeight: '900', color: '#64748B', textTransform: 'uppercase' }}>Dinero en Almacén (Costo)</small>
                        <h3 style={{ margin: '12px 0', fontSize: '2.5rem' }}>S/ {(auditoriaInv.cost ?? 0).toLocaleString('es-PE', {minimumFractionDigits:2})}</h3>
                    </div>
                    <div style={{ backgroundColor: '#FFF1F2', padding: '35px', borderRadius: '35px' }}>
                        <small style={{ fontWeight: '900', color: FUCSIA_PRINCIPAL, textTransform: 'uppercase' }}>Retorno al Mayor (Venta)</small>
                        <h3 style={{ margin: '10px 0', fontSize: '2.5rem', color: FUCSIA_PRINCIPAL }}>S/ {(auditoriaInv.vent ?? 0).toLocaleString('es-PE', {minimumFractionDigits:2})}</h3>
                    </div>
                    <div style={{ backgroundColor: '#F0FDF4', padding: '35px', borderRadius: '35px' }}>
                        <small style={{ fontWeight: '900', color: VERDE_EXITO, textTransform: 'uppercase' }}>Utilidad Proyectada</small>
                        <h3 style={{ margin: '10px 0', fontSize: '2.5rem', color: VERDE_EXITO }}>S/ {(auditoriaInv.util ?? 0).toLocaleString('es-PE', {minimumFractionDigits:2})}</h3>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '25px' }}>
              <div style={{ ...bjCard, borderLeft: `10px solid ${FUCSIA_PRINCIPAL}`, padding: '25px' }}><small style={{fontWeight:'900', opacity:0.6}}>EGRESOS TOTALES</small><h4 style={{fontSize:'1.8rem', margin:'10px 0'}}>S/ {(balanceGeneral.egresosTotales ?? 0).toFixed(2)}</h4></div>
              <div style={{ ...bjCard, borderLeft: '10px solid #16A34A', padding: '25px' }}><small style={{fontWeight:'900', opacity:0.6}}>INGRESOS EXTRAS</small><h4 style={{fontSize:'1.8rem', margin:'10px 0'}}>S/ {(balanceGeneral.ingresosExtras ?? 0).toFixed(2)}</h4></div>
              <div style={{ ...bjCard, borderLeft: '10px solid #3B82F6', padding: '25px' }}><small style={{fontWeight:'900', opacity:0.6}}>GANANCIA REAL ACUM.</small><h4 style={{fontSize:'1.8rem', margin:'10px 0', color:'#3B82F6'}}>S/ {(balanceGeneral.gananciaTotalAcumulada ?? 0).toFixed(2)}</h4></div>
              <div style={{ ...bjCard, backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', padding: '25px' }}><small style={{fontWeight:'900'}}>EFECTIVO EN CAJA</small><h4 style={{fontSize:'1.8rem', margin:'10px 0'}}>S/ {(balanceGeneral.efectivoCaja ?? 0).toFixed(2)}</h4></div>
            </div>

            {/* FORMULARIOS GESTIÓN */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '45px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
                <div style={bjCard}>
                  <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900', fontSize:'1.2rem' }}>💸 Registrar Gasto / Ingreso</h4>
                  <form onSubmit={handleRegistrarGastoDB} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <select value={formFinanzas.tipo} onChange={e => setFormFinanzas({...formFinanzas, tipo: e.target.value})} style={bjInput}><option value="Gasto Local">🏪 Gasto Local</option><option value="Inversión (Mercadería)">📦 Inversión (Mercadería)</option><option value="Retiro Personal">🏧 Retiro Personal</option><option value="Ingreso Adicional">💰 Ingreso Adicional</option></select>
                    <input placeholder="Descripción..." value={formFinanzas.descripcion} onChange={e => setFormFinanzas({...formFinanzas, descripcion: e.target.value})} style={bjInput} />
                    <input type="text" placeholder="Monto S/" value={formFinanzas.monto} onChange={e => setFormFinanzas({...formFinanzas, monto: handleInputMonto(e.target.value)})} style={bjInput} />
                    <button type="submit" style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>GUARDAR</button>
                  </form>
                </div>
                <div style={{ ...bjCard, border: `3px solid ${FUCSIA_PRINCIPAL}` }}>
                  <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900', fontSize:'1.2rem' }}>🆕 Subir Nuevo Modelo</h4>
                  <form onSubmit={handleAddProductoDB} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input placeholder="Nombre Modelo" value={formProd.nombre} onChange={e => setFormProd({...formProd, nombre: e.target.value})} style={bjInput} />
                    <input placeholder="Colores (comas: Rojo, Azul, Negro)" value={formProd.colores} onChange={e => setFormProd({...formProd, colores: e.target.value})} style={bjInput} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <input type="text" placeholder="Costo S/" value={formProd.precio_compra} onChange={e => setFormProd({...formProd, precio_compra: handleInputMonto(e.target.value)})} style={bjInput} />
                        <input type="number" placeholder="Stock" value={formProd.stock} onChange={e => setFormProd({...formProd, stock: e.target.value})} style={bjInput} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <input type="text" placeholder="P. MAYOR" value={formProd.precio_venta} onChange={e => setFormProd({...formProd, precio_venta: handleInputMonto(e.target.value)})} style={{...bjInput, border:`3px solid #F786C1` }} />
                        <input type="text" placeholder="P. MINOR" value={formProd.precio_menor} onChange={e => setFormProd({...formProd, precio_menor: handleInputMonto(e.target.value)})} style={{...bjInput, border:'3px solid #1E1B1C' }} />
                    </div>
                    <button type="submit" style={{ backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '22px', borderRadius: '22px', fontWeight: '900', cursor:'pointer' }}>REGISTRAR PRODUCTO</button>
                  </form>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
                {/* CONTROL DE STOCK */}
                <div style={bjCard}>
                  <h4 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, marginBottom: '25px', fontWeight: '900', fontSize:'1.4rem' }}>🔧 Ajuste de Stock Catálogo</h4>
                  <input placeholder="🔍 Buscar modelo..." value={busquedaStock} onChange={e => setBusquedaStock(e.target.value)} style={{ ...bjInput, padding: '15px', marginBottom: '25px', border: `3px solid ${FUCSIA_PRINCIPAL}` }} />
                  <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
                    {productos.filter(p => p.nombre?.toLowerCase().includes(busquedaStock.toLowerCase())).map(p => (
                      <div key={p.id} style={{ padding: '22px', border: '1px solid #f1f1f1', borderRadius: '30px', backgroundColor: '#fff', marginBottom: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                          <strong style={{fontSize:'16px'}}>{p.nombre}</strong>
                          <button onClick={async () => { if(confirm("¿Borrar definitivamente?")) await supabase.from('productos').delete().eq('id', p.id); }} style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor:'pointer', fontSize: '1.8rem' }}>🗑️</button>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', backgroundColor: '#F8FAFC', padding: '18px', borderRadius: '20px', alignItems: 'center' }}>
                          <input type="number" value={formEditStock[p.id] !== undefined ? formEditStock[p.id] : p.stock} onChange={e => setFormEditStock({...formEditStock, [p.id]: Number(e.target.value)})} style={{ width: '90px', padding: '10px', borderRadius: '12px', border: '1px solid #CBD5E1', textAlign: 'center', fontSize: '18px', fontWeight: '900' }} />
                          <button onClick={() => handleSyncStock(p)} style={{ background: '#1E1B1C', color: '#fff', border: 'none', padding: '15px 30px', borderRadius: '18px', fontSize: '13px', fontWeight: '900', flex: 1, cursor:'pointer' }}>GUARDAR STOCK</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* LIBRO DIARIO DETALLADO */}
                <div style={bjCard}>
                  <h4 style={{ marginTop: 0, marginBottom: '30px', fontWeight: '900', fontSize: '1.4rem' }}>📖 Libro Diario Detallado</h4>
                  <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                      <tbody>
                        {finanzas.map(f => (
                          <tr key={f.id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                            {idFinanzaEditando === f.id ? (
                               <td colSpan="3" style={{ padding: '25px', backgroundColor: '#FFF5F7', borderRadius: '30px', border: `3px solid ${FUCSIA_PRINCIPAL}` }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                      <select value={formEditFinanza.tipo} onChange={e=>setFormEditFinanza({...formEditFinanza, tipo:e.target.value})} style={bjInput}><option value="Gasto Local">Gasto Local</option><option value="Inversión (Mercadería)">Inversión (Mercadería)</option><option value="Retiro Personal">Retiro Personal</option><option value="Ingreso Adicional">Ingreso Adicional</option></select>
                                      <input value={formEditFinanza.descripcion} onChange={e=>setFormEditFinanza({...formEditFinanza, descripcion:e.target.value})} style={bjInput} />
                                      <input type="text" value={formEditFinanza.monto} onChange={e=>setFormEditFinanza({...formEditFinanza, monto:handleInputMonto(e.target.value)})} style={bjInput} />
                                      <div style={{display:'flex', gap:'15px', marginTop: '10px'}}><button onClick={handleUpdateLibroDB} style={{backgroundColor:VERDE_EXITO, color:'#fff', padding:'20px', borderRadius:'18px', border:'none', flex:2, fontWeight:'900', cursor:'pointer' }}>OK</button><button onClick={()=>setIdFinanzaEditando(null)} style={{background:'#64748B', color:'#fff', padding:'20px', borderRadius:'18px', border:'none', flex:1, fontWeight:'900', cursor:'pointer'}}>X</button></div>
                                  </div>
                               </td>
                            ) : (
                              <>
                                <td style={{ padding: '20px 10px' }}>
                                    <small style={{fontWeight:'900', color:'#64748B', display:'block'}}>{getFechaPeru(f.created_at)} | {getHoraPeru(f.created_at)}</small>
                                    <small style={{fontWeight:'900', color:FUCSIA_PRINCIPAL, textTransform:'uppercase'}}>{f.tipo}</small>
                                    <br/><span style={{ fontWeight: '600', fontSize: '15px' }}>{f.descripcion}</span>
                                </td>
                                <td style={{ textAlign: 'right', padding: '20px 10px', fontWeight: '900', fontSize: '17px', color: (f.tipo.includes('Ingreso')) ? VERDE_EXITO : '#1E1B1C' }}>S/ {(Number(f.monto) || 0).toFixed(2)}</td>
                                <td style={{ textAlign: 'right', padding: '20px 10px' }}>
                                  <button onClick={()=> { setIdFinanzaEditando(f.id); setFormEditFinanza({...f}); }} style={{background:'none', border:'none', cursor:'pointer', fontSize: '1.4rem', marginRight:'12px'}}>✏️</button>
                                  <button onClick={async ()=> { if(confirm("¿Borrar?")) await supabase.from('finanzas').delete().eq('id', f.id); }} style={{background:'none', border:'none', color: FUCSIA_PRINCIPAL, cursor:'pointer', fontSize: '1.4rem'}}>🗑️</button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* GRÁFICO ROI */}
                <div style={bjCard}>
                  <h4 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, marginBottom: '35px', fontWeight: '900', fontSize: '1.4rem' }}>📈 ROI / Retorno de Inversión</h4>
                  <div style={{ height: '350px', width: '100%' }}>
                    {(auditoriaInv.cost > 0) && (
                        <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartDataInversion} margin={{ top: 25, right: 30, left: -5, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="n" fontSize={13} fontWeight="900" axisLine={false} tickLine={false} dy={15} />
                            <YAxis fontSize={13} axisLine={false} tickLine={false} />
                            <Tooltip formatter={(v)=> `S/ ${v.toLocaleString()}`} contentStyle={{ borderRadius: '25px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', fontWeight: '900' }} />
                            <Bar dataKey="v" radius={[20, 20, 0, 0]} barSize={80}>
                                {chartDataInversion.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                        </ResponsiveContainer>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}