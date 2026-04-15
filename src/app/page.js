"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, Cell 
} from 'recharts';

/**
 * ============================================================================
 * SISTEMA BJ IMPORTACIONES CHICLAYO - VERSION 78.0
 * ARCHIVO: page.js (ESTRUCTURA DE INGENIERÍA MAESTRA)
 * ESTADO: REGISTRO DE VENTAS Y STOCK RE-VERIFICADOS
 * ============================================================================
 */

export default function SistemaBJCMasterFinal() {
  
  // ============================================================
  // [BLOQUE 1: UTILIDADES Y SEGURIDAD (HELPERS)]
  // ============================================================

  const getFechaPeru = (dateInput) => {
    try {
        const fechaBase = dateInput ? new Date(dateInput) : new Date();
        if (isNaN(fechaBase.getTime())) return new Date().toISOString().split('T')[0];
        const opcionesLocal = { timeZone: "America/Lima", year: 'numeric', month: '2-digit', day: '2-digit' };
        const formateadorBJ = new Intl.DateTimeFormat('en-CA', opcionesLocal);
        const partesBJ = formateadorBJ.formatToParts(fechaBase);
        const anioBJ = partesBJ.find(p => p.type === 'year')?.value || "2026";
        const mesBJ = partesBJ.find(p => p.type === 'month')?.value || "01";
        const diaBJ = partesBJ.find(p => p.type === 'day')?.value || "01";
        return `${anioBJ}-${mesBJ}-${diaBJ}`;
    } catch (e) { return new Date().toISOString().split('T')[0]; }
  };

  const getHoraPeru = (dateInput) => {
    if (!dateInput) return "--:--";
    try {
        const dH = new Date(dateInput);
        if (isNaN(dH.getTime())) return "--:--";
        return dH.toLocaleTimeString('es-PE', { timeZone: "America/Lima", hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) { return "--:--"; }
  };

  const handleInputMonto = (v) => {
    if (v === undefined || v === null) return "";
    const aTexto = String(v);
    const conPunto = aTexto.replace(',', '.');
    return conPunto.replace(/[^0-9.]/g, '');
  };

  const getEtiquetaProducto = (f) => {
    if (!f) return null;
    try {
        const diff = Math.floor((new Date() - new Date(f)) / (1000 * 60 * 60 * 24));
        if (diff <= 3) return { tipo: 'NUEVO', icono: '✨', color: '#F01097' };
        if (diff <= 8) return { tipo: 'RECIENTE', icono: '📦', color: '#A13C6D' };
        return null;
    } catch (e) { return null; }
  };

  // ============================================================
  // [BLOQUE 2: ALMACÉN DE ESTADOS (useState)]
  // ============================================================

  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [finanzas, setFinanzas] = useState([]);
  const [vista, setVista] = useState('ventas'); 
  const [cargando, setCargando] = useState(true);
  
  const [busqueda, setBusqueda] = useState(''); 
  const [fechaConsulta, setFechaConsulta] = useState(getFechaPeru());
  
  const [cliente, setCliente] = useState('');
  const [localidad, setLocalidad] = useState(''); 
  const [telefono, setTelefono] = useState(''); 
  const [tipoVenta, setTipoVenta] = useState('Mayor'); 
  const [cantidades, setCantidades] = useState({});
  const [coloresElegidos, setColoresElegidos] = useState({});
  const [carrito, setCarrito] = useState([]);
  const [descuento, setDescuento] = useState(0); 

  const [idItemVentaEditando, setIdItemVentaEditando] = useState(null); 
  const [nuevaCantVenta, setNuevaCantVenta] = useState(0);
  const [formProd, setFormProd] = useState({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
  const [formFinanzas, setFormFinanzas] = useState({ tipo: 'Gasto Local', descripcion: '', monto: '', origen: 'Caja Global' });

  const FUCSIA_PRINCIPAL = '#F01097';
  const VERDE_BJ = '#16A34A';
  const ROJO_BJ = '#E11D48';
  const AMARILLO_BJ = '#CA8A04';
  const OSCURO_BJ = '#1E1B1C';

  // ============================================================
  // [BLOQUE 3: FUNCIONES DE ACCIÓN (VENTAS Y CRUD)]
  // Lógica reparada para el registro de ventas v78.
  // ============================================================

  const handleAutocompleteCliente = (e) => {
    const valInput = e.target.value; setCliente(valInput);
    const mCli = (ventas || []).find(v => v && v.cliente_nombre?.toLowerCase() === valInput.toLowerCase());
    if (mCli) { setLocalidad(mCli.localidad || ''); setTelefono(mCli.telefono || ''); }
  };

  const handleEjecutarVentaBJ = async (estadoOperativo) => {
    if (!cliente || !localidad) return alert("Error: Cliente y Zona son obligatorios.");
    if (carrito.length === 0) return alert("Error: El carrito está vacío.");
    
    // Cálculo de descuento proporcional
    const totalVentaSinDescuento = carrito.reduce((acc, item) => acc + (Number(item.precio_venta) * item.cantidad), 0);
    const ratioDescuento = totalVentaSinDescuento > 0 ? (Number(descuento) / totalVentaSinDescuento) : 0;

    const listaParaInsertar = carrito.map(item => {
        const precioVentaU = Number(item.precio_venta);
        const precioCostoU = Number(item.precio_compra || 0);
        const subtotalItem = precioVentaU * item.cantidad;
        
        // Ganancia = (Venta - Costo) - Parte del descuento global
        const gananciaItem = ((precioVentaU - precioCostoU) * item.cantidad) - (subtotalItem * ratioDescuento);

        return { 
            cliente_nombre: cliente, 
            localidad: localidad, 
            telefono: telefono || '', 
            producto_id: item.producto_id, 
            cantidad: item.cantidad, 
            color: item.color, 
            precio_venta_unitario: precioVentaU, 
            precio_costo_unitario: precioCostoU, 
            ganancia_total: gananciaItem, 
            estado_pedido: estadoOperativo 
        };
    });

    const { error } = await supabase.from('ventas').insert(listaParaInsertar);

    if (error) {
        console.error("Error Supabase:", error);
        alert("No se pudo guardar la venta. Inténtalo de nuevo.");
    } else {
        // Descontar stock solo si la venta se guardó
        for (const it of carrito) {
            const pReal = productos.find(p => p.id === it.producto_id);
            if (pReal) {
                await supabase.from('productos').update({ stock: pReal.stock - it.cantidad }).eq('id', it.producto_id);
            }
        }
        // Resetear formulario
        setCliente(''); setLocalidad(''); setTelefono(''); setCarrito([]); setDescuento(0);
        alert("✅ Operación registrada y stock actualizado.");
        await cargarTodoDesdeNube();
    }
  };

  const handleAddProductoBJ = async (e) => {
    if(e) e.preventDefault();
    if (!formProd.nombre) return alert("El nombre del modelo es obligatorio.");
    const { error } = await supabase.from('productos').insert([{
        nombre: formProd.nombre, 
        precio_compra: Number(handleInputMonto(formProd.precio_compra)),
        precio_venta: Number(handleInputMonto(formProd.precio_venta)), 
        precio_menor: Number(handleInputMonto(formProd.precio_menor)),
        stock: Number(formProd.stock), 
        colores: formProd.colores
    }]);
    if (!error) {
        setFormProd({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
        alert("✨ Modelo creado exitosamente.");
        await cargarTodoDesdeNube();
    }
  };

  const handleRegistrarFinanzaBJ = async (e) => {
    if(e) e.preventDefault();
    const montoFinal = handleInputMonto(formFinanzas.monto);
    if (!montoFinal) return alert("Por favor, ingresa un monto.");
    const { error } = await supabase.from('finanzas').insert([{
        tipo: formFinanzas.tipo, 
        descripcion: formFinanzas.descripcion, 
        monto: Number(montoFinal), 
        origen: formFinanzas.origen 
    }]);
    if (!error) {
        setFormFinanzas({tipo:'Gasto Local', descripcion:'', monto:'', origen: 'Caja Global'});
        alert("✅ Movimiento de caja registrado.");
        await cargarTodoDesdeNube();
    }
  };

  const handleCobrarDeudaBJ = async (grupo) => {
    if(confirm(`¿Confirmar cobro de S/ ${grupo.total.toFixed(2)}?`)) {
        const ids = grupo.items_ids || [];
        for(let id of ids) {
            await supabase.from('ventas').update({ estado_pedido: 'Entregado' }).eq('id', id);
        }
        alert("💰 Pago recibido y procesado.");
        await cargarTodoDesdeNube();
    }
  };

  const handleAnularVentaBJ = async (v) => {
    if (confirm("¿Anular este ítem? El stock será devuelto al catálogo.")) {
      const pc = productos.find(pr => pr.id === v.producto_id);
      if (pc) await supabase.from('productos').update({ stock: pc.stock + v.cantidad }).eq('id', pc.id);
      await supabase.from('ventas').delete().eq('id', v.id);
      await cargarTodoDesdeNube();
    }
  };

  // ============================================================
  // [BLOQUE 4: LÓGICA DE PROCESAMIENTO (useMemo)]
  // Clasificación de Logística, Balances y Rankings.
  // ============================================================

  const logisticaInteligente = useMemo(() => {
    const resLog = { almacen: [], deudas: [] };
    if (!ventas || ventas.length === 0) return resLog;

    try {
        const mA = {}; const mD = {};

        ventas.forEach(v => {
            if (!v || !v.cliente_nombre) return;
            const key = `${v.cliente_nombre}-${v.localidad || 'SN'}`;
            
            const pMatch = productos.find(p => p.id === v.producto_id);
            const itemDetalle = {
                id: v.id,
                nombre: pMatch ? pMatch.nombre : "Producto",
                cantidad: v.cantidad,
                color: v.color
            };

            if (v.estado_pedido === 'En Almacén') {
                if (!mA[key]) mA[key] = { cliente: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, items: [], total: 0, items_ids: [] };
                mA[key].items.push(itemDetalle);
                mA[key].items_ids.push(v.id);
                mA[key].total += (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0));
            }
            
            if (v.estado_pedido === 'Pendiente de Pago') {
                if (!mD[key]) mD[key] = { cliente: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, items: [], total: 0, items_ids: [] };
                mD[key].items.push(itemDetalle);
                mD[key].items_ids.push(v.id);
                mD[key].total += (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0));
            }
        });

        resLog.almacen = Object.values(mA);
        resLog.deudas = Object.values(mD);
        return resLog;
    } catch (e) { return resLog; }
  }, [ventas, productos]);

  const historialVentasDiaBJ = useMemo(() => {
    if (!Array.isArray(ventas) || ventas.length === 0) return [];
    try {
        const filt = ventas.filter(v => v && getFechaPeru(v.created_at) === fechaConsulta);
        const grupos = {};
        filt.forEach(v => {
            const hU = v.created_at ? v.created_at.substring(0,16) : "0000";
            const idG = `${v.cliente_nombre || 'SN'}-${v.localidad || 'SZ'}-${hU}`; 
            if (!grupos[idG]) grupos[idG] = { id_grupo: idG, cliente_nombre: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, hora: getHoraPeru(v.created_at), total: 0, items: [] };
            grupos[idG].items.push(v); grupos[idG].total += (Number(v.precio_venta_unitario ?? 0) * Number(v.cantidad ?? 0));
        });
        return Object.values(grupos).reverse();
    } catch (e) { return []; }
  }, [ventas, fechaConsulta]);

  const balanceEliteBJ = useMemo(() => {
    const fallback = { cH: 0, gH: 0, cG: 0, bR: 0, pe_p: 0, pe_g: 0, pe_m: 0 };
    if (!ventas.length || !finanzas.length) return fallback;
    try {
        const hoyS = getFechaPeru();
        const mesI = hoyS.substring(0,7);
        
        const vH = ventas.filter(v => v && getFechaPeru(v.created_at) === hoyS && v.estado_pedido !== 'Pendiente de Pago');
        const gAcum = ventas.reduce((acc, v) => acc + (Number(v?.ganancia_total) || 0), 0);
        const retG = finanzas.filter(f => f && f.origen === 'Ganancias').reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
        const inS = ventas.filter(v => v && v.estado_pedido !== 'Pendiente de Pago').reduce((acc, v) => acc + (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0)), 0);
        const inK = finanzas.filter(f => f && ['Ingreso Adicional','Inversión Inicial'].includes(f.tipo)).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
        const outG = finanzas.filter(f => f && ['Gasto Local','Inversión (Mercadería)','Retiro Personal'].includes(f.tipo)).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
        const metaE = finanzas.filter(f => f && getFechaPeru(f.created_at).substring(0,7) === mesI && ['Gasto Local','Retiro Personal'].includes(f.tipo)).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
        const utilM = ventas.filter(v => v && getFechaPeru(v.created_at).substring(0,7) === mesI && v.estado_pedido !== 'Pendiente de Pago').reduce((acc, v) => acc + (Number(v.ganancia_total) || 0), 0);
        let prog = metaE > 0 ? (utilM / metaE) * 100 : (utilM > 0 ? 100 : 0);

        return { 
            cH: vH.reduce((acc, v) => acc + (Number(v.precio_venta_unitario ?? 0) * Number(v.cantidad ?? 0)), 0),
            gH: vH.reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0),
            cG: (inS + inK - outG),
            bR: (gAcum - retG),
            pe_p: prog, pe_g: utilM, pe_m: metaE
        };
    } catch (e) { return fallback; }
  }, [finanzas, ventas]);

  const valorizacionInventarioTotal = useMemo(() => {
    let c = 0; let v = 0;
    productos.forEach(p => { if (p && Number(p.stock) > 0) { c += (Number(p.precio_compra || 0) * p.stock); v += (Number(p.precio_venta || 0) * p.stock); } });
    return { cost: c, vent: v };
  }, [productos]);

  const analyticsBJMaster = useMemo(() => {
    try {
        const dict = {};
        ventas.forEach(v => {
            const pMatch = productos.find(p => p.id === v.producto_id);
            const nMod = pMatch ? pMatch.nombre : "Eliminado";
            dict[nMod] = (dict[nMod] || 0) + Number(v.ganancia_total || 0);
        });
        return Object.entries(dict).sort((a,b) => b[1] - a[1]).slice(0, 5);
    } catch (e) { return []; }
  }, [ventas, productos]);

  const chartROIConfigBJ = [
    { n: 'Costo Almacén', v: valorizacionInventarioTotal.cost || 0, fill: OSCURO_BJ },
    { n: 'Retorno Potencial', v: valorizacionInventarioTotal.vent || 0, fill: FUCSIA_PRINCIPAL }
  ];

  // ============================================================
  // [BLOQUE 5: CONEXIÓN SUPABASE Y EXPORTACIÓN]
  // ============================================================

  const cargarTodoDesdeNube = async () => {
    try {
        const { data: p } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
        const { data: v } = await supabase.from('ventas').select('*').order('created_at', { ascending: true });
        const { data: f } = await supabase.from('finanzas').select('*').order('created_at', { ascending: false });
        if (p) setProductos(p); if (v) setVentas(v); if (f) setFinanzas(f);
    } catch (e) { console.error("Error al sincronizar:", e); }
    finally { setCargando(false); }
  };

  const handleExportarExcelCajaFull = () => {
    let csvBJ = "REPORTE DE AUDITORIA Y CIERRE DIARIO - BJ IMPORTACIONES\n";
    csvBJ += `Fecha: ${fechaConsulta}\n`;
    csvBJ += `--------------------------------------------------\n`;
    csvBJ += `SALDO CAJA GLOBAL,S/ ${balanceEliteBJ.cG.toFixed(2)}\n`;
    csvBJ += `BOVEDA UTILIDADES,S/ ${balanceEliteBJ.bR.toFixed(2)}\n`;
    csvBJ += `VENTAS DIA (EFECTIVO),S/ ${balanceEliteBJ.cH.toFixed(2)}\n`;
    csvBJ += `GANANCIA NETA DIA,S/ ${balanceEliteBJ.gH.toFixed(2)}\n`;
    csvBJ += `--------------------------------------------------\n\n`;
    csvBJ += "Hora,Cliente,Zona,Producto,Variante,Cant,Precio,Subtotal\n";
    ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta).forEach(v => {
      const nomP = productos.find(p=>p.id===v.producto_id)?.nombre || "Modelo";
      csvBJ += `${getHoraPeru(v.created_at)},${v.cliente_nombre},${v.localidad},${nomP},${v.color},${v.cantidad},${v.precio_venta_unitario},${(v.precio_venta_unitario*v.cantidad).toFixed(2)}\n`;
    });
    const blobOBJ = new Blob([csvBJ], { type: 'text/csv;charset=utf-8;' });
    const linkB = document.createElement("a"); linkB.setAttribute("href", URL.createObjectURL(blobOBJ));
    linkB.setAttribute("download", `AUDITORIA_BJ_${fechaConsulta}.csv`); linkB.click();
  };

  useEffect(() => {
    cargarTodoDesdeNube();
    const arranqueBJ = setTimeout(() => setCargando(false), 3000);
    return () => clearTimeout(arranqueBJ);
  }, []);

  // ============================================================
  // [BLOQUE 6: INTERFAZ DE USUARIO (JSX)]
  // ============================================================

  const sInp_BJ = { padding: '16px', borderRadius: '16px', border: `2px solid #FCC2E2`, width: '100%', outline: 'none', fontSize: '15px', boxSizing: 'border-box', backgroundColor: '#fff', transition: '0.3s' };
  const sCrd_BJ = { backgroundColor: '#ffffff', borderRadius: '35px', padding: '35px', boxShadow: `0 20px 40px rgba(247, 134, 193, 0.1)`, border: '1px solid #FFF1F2' };

  if (cargando) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', backgroundColor:'#FFF5F7', color:FUCSIA_PRINCIPAL, fontWeight:'900', fontSize:'1.5rem' }}>
        INICIANDO BUNKER BJ ELITE v78... 🚀💎
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF5F7', color: OSCURO_BJ, fontFamily: 'system-ui, sans-serif' }}>
      
      {/* 🚀 NAVBAR GLOBAL */}
      <header style={{ backgroundColor: '#ffffff', padding: '15px 5%', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 4px 15px rgba(0,0,0,0.06)`, flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', width: '45px', height: '45px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.2rem' }}>BJ</div>
          <div><h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>BJ IMPORTACIONES</h1><small style={{ color: '#64748B', fontWeight: '900', fontSize: '10px' }}>v78 MASTER VENTAS</small></div>
        </div>
        <nav style={{ display: 'flex', gap: '10px', backgroundColor: `#FCA5D415`, padding: '6px', borderRadius: '18px' }}>
          <button onClick={() => setVista('ventas')} style={{ backgroundColor: vista === 'ventas' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'ventas' ? '#fff' : FUCSIA_PRINCIPAL, padding: '10px 18px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900' }}>VENTAS</button>
          <button onClick={() => setVista('logistica')} style={{ backgroundColor: vista === 'logistica' ? OSCURO_BJ : 'transparent', border: 'none', color: vista === 'logistica' ? '#fff' : OSCURO_BJ, padding: '10px 18px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900' }}>LOGÍSTICA</button>
          <button onClick={() => setVista('contabilidad')} style={{ backgroundColor: vista === 'contabilidad' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'contabilidad' ? '#fff' : FUCSIA_PRINCIPAL, padding: '10px 18px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900' }}>GESTIÓN</button>
        </nav>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '30px 20px' }}>
        
        {/* ===================== [ZONA: VISTA VENTAS] ===================== */}
        {vista === 'ventas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
              <div style={sCrd_BJ}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>💰 CAJA EFECTIVO HOY (LIQUIDO)</span>
                    <button onClick={handleExportarExcelCajaFull} style={{ background:`${FUCSIA_PRINCIPAL}20`, border:'none', padding:'8px 15px', borderRadius:'10px', color:FUCSIA_PRINCIPAL, fontWeight:'900', fontSize:'10px', cursor:'pointer' }}>CIERRE AUDITOR</button>
                </div>
                <h2 style={{ margin: '15px 0', fontSize: '3.5rem', fontWeight: '900' }}>S/ {balanceEliteBJ.cH.toFixed(2)}</h2>
                <div style={{ color: VERDE_BJ, fontWeight: '900', fontSize: '15px' }}>Ganancia Día: S/ {balanceEliteBJ.gH.toFixed(2)}</div>
              </div>
              <div style={sCrd_BJ}>
                <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>📅 BUSCAR HISTORIAL BJ</span>
                <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...sInp_BJ, marginTop: '15px' }} />
              </div>
            </div>

            <div style={{ ...sCrd_BJ, border: `3px solid #FCA5D4` }}>
              <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontWeight: '900', marginBottom:'25px' }}>🛒 Registrar Operación Chiclayo</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '30px' }}>
                <input list="clis_v78" placeholder="👤 Nombre Cliente" value={cliente} onChange={handleAutocompleteCliente} style={sInp_BJ} />
                <datalist id="clis_v78">{[...new Set(ventas.map(v => v.cliente_nombre))].map((c, i) => <option key={i} value={c} />)}</datalist>
                <input placeholder="📍 Zona / Distrito" value={localidad} onChange={e => setLocalidad(e.target.value)} style={sInp_BJ} />
                <input placeholder="📱 WhatsApp" value={telefono} onChange={e => setTelefono(e.target.value)} style={sInp_BJ} />
              </div>

              {carrito.length > 0 && (
                <div style={{ backgroundColor: '#FFF9FB', border: `2px dashed ${FUCSIA_PRINCIPAL}`, borderRadius: '25px', padding: '30px', marginBottom: '40px' }}>
                  {carrito.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #FCC2E2', paddingBottom: '15px', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}><strong>{item.cantidad}x</strong> {item.nombre} <br/><small style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900' }}>COLOR: {item.color}</small></div>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <input type="text" value={item.precio_venta} onChange={(e) => { const n = [...carrito]; n[idx].precio_venta = handleInputMonto(e.target.value); setCarrito(n); }} style={{ width: '80px', borderRadius: '10px', border: '1px solid #FCA5D4', textAlign: 'center', fontSize: '17px', fontWeight: '900' }} />
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
                    <button onClick={() => handleEjecutarVentaBJ('Entregado')} style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '20px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '14px' }}>✅ PAGADO/ENTREGA</button>
                    <button onClick={() => handleEjecutarVentaBJ('En Almacén')} style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '20px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '14px' }}>📦 PAGADO/ALMACÉN</button>
                    <button onClick={() => handleEjecutarVentaBJ('Pendiente de Pago')} style={{ backgroundColor: AMARILLO_BJ, color: '#fff', border: 'none', padding: '20px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '14px' }}>💸 DAR A PAGAR (CRÉDITO)</button>
                  </div>
                </div>
              )}

              <input placeholder="🔍 Buscar modelo para vender..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...sInp_BJ, marginBottom: '25px', height: '65px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '25px', maxHeight: '750px', overflowY: 'auto' }}>
                {productos.filter(p => p.nombre?.toLowerCase().includes(busqueda.toLowerCase())).map((p) => {
                  const tagBJ = getEtiquetaProducto(p.created_at);
                  const pShowBJ = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
                  return (
                    <div key={p.id} style={{ border: Number(p.stock) < 5 ? `2px solid ${ROJO_BJ}` : '1px solid #FFF1F2', padding: '22px', borderRadius: '35px', backgroundColor: '#fff', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
                      {tagBJ && <span style={{ position:'absolute', top: '-15px', left: '20px', backgroundColor: tagBJ.color, color: '#fff', fontSize: '10px', padding: '6px 15px', borderRadius: '15px', fontWeight: '900', zIndex: 10 }}>{tagBJ.tipo}</span>}
                      <strong style={{ display: 'block', height: '45px', overflow: 'hidden', fontSize: '16px' }}>{p.nombre}</strong>
                      <div style={{ margin: '10px 0', padding: '10px', backgroundColor: Number(p.stock) < 5 ? '#FFF1F2' : '#F0FDF4', borderRadius: '18px', textAlign: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: '900', color: Number(p.stock) < 5 ? ROJO_BJ : VERDE_BJ }}>STOCK: {p.stock} U.</span>
                      </div>
                      <select value={coloresElegidos[p.id]} onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{ ...sInp_BJ, padding: '10px', fontSize: '14px', marginBottom: '18px', height: '50px' }}>
                        {p.colores?.split(',').map(c => <option key={c} value={c.trim()}>{c.trim()}</option>)}
                      </select>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '18px', marginBottom: '22px' }}>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.max(1, (cantidades[p.id] || 1) - 1)})} style={{ border: 'none', background: '#f5f5f5', borderRadius: '12px', width: '48px', height: '48px', cursor:'pointer' }}>-</button>
                        <span style={{ fontWeight: '900', fontSize: '22px', paddingTop:'10px' }}>{cantidades[p.id] || 1}</span>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.min(p.stock, (cantidades[p.id] || 1) + 1)})} style={{ border: 'none', background: '#f5f5f5', borderRadius: '12px', width: '48px', height: '48px', cursor:'pointer' }}>+</button>
                      </div>
                      <button onClick={() => {
                          const cE = Number(cantidades[p.id] || 1);
                          const pE = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
                          const enC = carrito.filter(i => i.producto_id === p.id).reduce((acc, i) => acc + i.cantidad, 0);
                          if ((Number(p.stock) || 0) < cE + enC) return alert("¡Sin stock!");
                          setCarrito([...carrito, { producto_id: p.id, nombre: p.nombre, cantidad: cE, color: (coloresElegidos[p.id] || "Único"), precio_venta: pE, precio_compra: p.precio_compra }]);
                      }} disabled={p.stock <= 0} style={{ width: '100%', backgroundColor: tipoVenta === 'Mayor' ? OSCURO_BJ : '#A13C6D', color: '#fff', border: 'none', padding: '18px', borderRadius: '22px', fontSize: '14px', fontWeight: '900', cursor:'pointer' }}>
                        {p.stock > 0 ? `VENDER S/ ${Number(pShowBJ).toFixed(2)}` : 'AGOTADO'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={sCrd_BJ}>
                <h4 style={{margin:0, color:'#64748B', fontWeight:'900', fontSize:'13px', textTransform:'uppercase', marginBottom:'25px'}}>📜 Historial de Operaciones Diarias</h4>
                {historialVentasDiaBJ.map(grupo => (
                    <div key={grupo.id_grupo} style={{ padding: '25px', backgroundColor: '#FFF5F7', borderRadius: '25px', border: `1px solid #FCC2E2`, marginBottom:'20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                            <div>
                                <small style={{ fontWeight:'900', color: FUCSIA_PRINCIPAL }}>⏰ HORA: {grupo.hora}</small>
                                <br/><strong style={{ color: OSCURO_BJ, fontSize: '22px' }}>{grupo.cliente_nombre}</strong>
                                <br/><small>📍 {grupo.localidad} | 📱 {grupo.telefono}</small>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ backgroundColor: VERDE_BJ, color: '#fff', padding: '10px 20px', borderRadius: '12px', fontWeight: '900' }}>S/ {grupo.total.toFixed(2)}</div>
                                <button onClick={() => {
                                    let msgBJ = `¡Hola *${grupo.cliente_nombre}*! 👋 Recibo de BJ Chiclayo.%0A%0A`;
                                    grupo.items.forEach(v => {
                                        const pR = productos.find(p => p.id === v.producto_id);
                                        msgBJ += `- *${v.cantidad}x* ${pR?.nombre || 'Item'} (${v.color}): S/ ${(v.precio_venta_unitario * v.cantidad).toFixed(2)}%0A`;
                                    });
                                    msgBJ += `%0A*TOTAL PAGADO: S/ ${grupo.total.toFixed(2)}*%0A¡Gracias! 😊`;
                                    window.open(`https://wa.me/51${grupo.telefono?.replace(/\D/g,'')}?text=${msgBJ}`, '_blank');
                                }} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '12px', fontWeight:'900', cursor:'pointer' }}>TICKET 📱</button>
                            </div>
                        </div>
                        <div style={{marginTop:'15px'}}>{grupo.items.map(v => (
                            <div key={v.id} style={{background:'#fff', padding:'10px 20px', borderRadius:'15px', marginBottom:'8px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <div><small>{v.cantidad}x {productos.find(p=>p.id===v.producto_id)?.nombre || 'Item'} ({v.color}) | {v.estado_pedido}</small></div>
                                <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                                    <strong>S/ {(v.precio_venta_unitario * v.cantidad).toFixed(2)}</strong>
                                    <button onClick={()=>handleAnularVentaBJ(v)} style={{border:'none', background:'none', color:ROJO_BJ, fontWeight:'bold', cursor:'pointer'}}>🗑️</button>
                                </div>
                            </div>
                        ))}</div>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* ===================== [ZONA: VISTA LOGÍSTICA] ===================== */}
        {vista === 'logistica' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            <div style={sCrd_BJ}>
                <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: FUCSIA_PRINCIPAL, marginBottom:'25px' }}>📦 Entregas Pendientes (Pagado en Local)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {logisticaInteligente.almacen.map((grupo, idx) => (
                        <div key={idx} style={{ padding: '25px', border: '2px solid #F1F5F9', borderRadius: '25px', backgroundColor: '#fff' }}>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
                                <div><strong>{grupo.cliente}</strong><br/><small style={{color: '#64748B'}}>📍 {grupo.localidad}</small></div>
                                <button onClick={() => {
                                    let listaWA = grupo.items.map(i => `${i.cantidad}x ${i.nombre}`).join(', ');
                                    let m = `¡Hola *${grupo.cliente}*! 👋 Tu pedido de: ${listaWA} ya está listo en BJ. ✨`;
                                    window.open(`https://wa.me/51${grupo.telefono?.replace(/\D/g,'')}?text=${encodeURI(m)}`, '_blank');
                                }} style={{ background:'#25D366', color:'#fff', border:'none', padding:'10px 15px', borderRadius:'12px', fontWeight:'900', cursor:'pointer' }}>AVISAR 📱</button>
                            </div>
                            <div style={{ background: '#F8FAFC', padding: '15px', borderRadius: '18px', marginBottom: '15px' }}>
                                {grupo.items.map((it, i) => (
                                    <div key={i} style={{ fontSize: '14px', marginBottom: '4px' }}>
                                        <span><strong>{it.cantidad}x</strong> {it.nombre}</span> <small>({it.color})</small>
                                    </div>
                                ))}
                            </div>
                            <button onClick={async () => {
                                if(confirm("¿Confirmar entrega física de estos productos?")) {
                                    for(let idV of grupo.items_ids) { await supabase.from('ventas').update({estado_pedido:'Entregado'}).eq('id', idV); }
                                    alert("✅ Entregado."); await cargarTodoDesdeNube();
                                }
                            }} style={{ width: '100%', backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: '900', cursor:'pointer' }}>CONFIRMAR ENTREGA ✅</button>
                        </div>
                    ))}
                    {logisticaInteligente.almacen.length === 0 && <p style={{opacity:0.5}}>No hay entregas pendientes.</p>}
                </div>
            </div>

            <div style={{ ...sCrd_BJ, borderLeft: `15px solid ${AMARILLO_BJ}` }}>
                <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: AMARILLO_BJ, marginBottom:'25px' }}>💸 Cuentas Deudoras (Ventas a Crédito)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {logisticaInteligente.deudas.map((grupo, idx) => (
                        <div key={idx} style={{ padding: '25px', backgroundColor: '#FFFBEB', borderRadius: '25px', border:`2px solid ${AMARILLO_BJ}40` }}>
                            <div><strong>{grupo.cliente}</strong><br/><small>{grupo.localidad}</small></div>
                            <h4 style={{color:AMARILLO_BJ, margin:'10px 0'}}>DEUDA: S/ {grupo.total.toFixed(2)}</h4>
                            <div style={{ background: '#fff', padding: '12px', borderRadius: '15px', marginBottom: '15px' }}>
                                {grupo.items.map((it, i) => <div key={i} style={{ fontSize: '13px' }}>• {it.cantidad}x {it.nombre}</div>)}
                            </div>
                            <button onClick={() => handleCobrarDeudaBJ(grupo)} style={{ width: '100%', backgroundColor: VERDE_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: '900', cursor:'pointer' }}>💰 REGISTRAR PAGO TOTAL</button>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        )}

        {/* ===================== [ZONA: VISTA GESTIÓN] ===================== */}
        {vista === 'contabilidad' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
                <div style={sCrd_BJ}>
                    <h4 style={{margin:0, color:FUCSIA_PRINCIPAL, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>🏁 PUNTO DE EQUILIBRIO</h4>
                    <div style={{height:'20px', width:'100%', backgroundColor:'#F1F5F9', borderRadius:'10px', overflow:'hidden', marginBottom:'15px'}}>
                        <div style={{height:'100%', width:`${balanceEliteBJ.pe_p}%`, backgroundColor:VERDE_BJ, transition:'1s'}}></div>
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'13px'}}>
                        <span>Utilidad: S/ {balanceEliteBJ.pe_g.toFixed(2)}</span>
                        <strong>Meta: S/ {balanceEliteBJ.pe_m.toFixed(2)}</strong>
                    </div>
                </div>
                <div style={{ ...sCrd_BJ, backgroundColor: OSCURO_BJ, color: '#fff', border:`4px solid ${FUCSIA_PRINCIPAL}` }}>
                    <h4 style={{margin:0, color:FUCSIA_PRINCIPAL, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>💰 BÓVEDA (UTILIDAD NETA DISPO)</h4>
                    <h3 style={{fontSize:'3.2rem', margin:0, color:'#fff'}}>S/ {balanceEliteBJ.bR.toFixed(2)}</h3>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '45px' }}>
                <div style={sCrd_BJ}>
                  <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900' }}>💸 Registrar Movimiento de Caja</h4>
                  <form onSubmit={handleRegistrarFinanzaBJ} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                        <select value={formFinanzas.tipo} onChange={e => setFormFinanzas({...formFinanzas, tipo: e.target.value})} style={sInp_BJ}>
                            <option value="Gasto Local">🏪 Gasto Local</option>
                            <option value="Retiro Personal">🏧 Retiro Personal</option>
                            <option value="Ingreso Adicional">💰 Inyección Capital</option>
                        </select>
                        <select value={formFinanzas.origen} onChange={e => setFormFinanzas({...formFinanzas, origen: e.target.value})} style={{...sInp_BJ, border:`2px solid ${AMARILLO_BJ}`}}>
                            <option value="Caja Global">Caja Global</option>
                            <option value="Ganancias">Ganancias</option>
                        </select>
                    </div>
                    <input placeholder="Descripción..." value={formFinanzas.descripcion} onChange={e => setFormFinanzas({...formFinanzas, descripcion: e.target.value})} style={sInp_BJ} />
                    <input placeholder="Monto S/" value={formFinanzas.monto} onChange={e => setFormFinanzas({...formFinanzas, monto: handleInputMonto(e.target.value)})} style={sInp_BJ} />
                    <button type="submit" style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>GUARDAR REGISTRO</button>
                  </form>
                </div>
                <div style={sCrd_BJ}>
                  <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900' }}>🆕 Subir Nuevo Producto</h4>
                  <form onSubmit={handleAddProductoBJ} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input placeholder="Nombre Modelo" value={formProd.nombre} onChange={e => setFormProd({...formProd, nombre: e.target.value})} style={sInp_BJ} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <input placeholder="Costo Compra" value={formProd.precio_compra} onChange={e => setFormProd({...formProd, precio_compra: handleInputMonto(e.target.value)})} style={sInp_BJ} />
                        <input placeholder="Precio Mayor" value={formProd.precio_venta} onChange={e => setFormProd({...formProd, precio_venta: handleInputMonto(e.target.value)})} style={sInp_BJ} />
                    </div>
                    <input placeholder="Stock Inicial" value={formProd.stock} onChange={e => setFormProd({...formProd, stock: e.target.value})} style={sInp_BJ} />
                    <button type="submit" style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>CREAR PRODUCTO</button>
                  </form>
                </div>
            </div>

            <div style={sCrd_BJ}>
                <h4 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, marginBottom: '35px', fontWeight: '900', fontSize: '1.4rem' }}>📈 ROI / Retorno de Inversión Almacén</h4>
                <div style={{ height: '400px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartROIConfigBJ} margin={{ top: 25, right: 30, left: -5, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="n" fontSize={13} fontWeight="900" axisLine={false} tickLine={false} dy={15} />
                            <YAxis fontSize={13} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '25px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', fontWeight: '900' }} />
                            <Bar dataKey="v" radius={[20, 20, 0, 0]} barSize={90}>
                                {chartROIConfigBJ.map((entry, index) => ( <Cell key={index} fill={entry.fill} /> ))}
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