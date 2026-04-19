"use client";
/**
 * ============================================================================
 * SISTEMA BJ IMPORTACIONES CHICLAYO - VERSION 106.1 (FIX MODULAR)
 * ESTADO: CÓDIGO COMPLETO - PROTECCIÓN DE COLORES Y DEUDAS REALES
 * ============================================================================
 */

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { getFechaPeru, handleInputMonto, getHoraPeru } from '../lib/helpers';

// IMPORTACIÓN DE COMPONENTES MODULARES
import VentasSection from '../components/Ventas';
import AlmacenSection from '../components/Almacen';
import LogisticaSection from '../components/Logistica';
import GestionSection from '../components/Gestion';

export default function SistemaBJCMasterFinal() {
  
  // [BLOQUE A: ESTADOS GLOBALES]
  const [hasMounted, setHasMounted] = useState(false);
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [finanzas, setFinanzas] = useState([]);
  const [vista, setVista] = useState('ventas'); 
  const [cargando, setCargando] = useState(true);

  // [BLOQUE B: ESTADOS DE CONTROL]
  const [busqueda, setBusqueda] = useState(''); 
  const [busquedaStock, setBusquedaStock] = useState(''); 
  const [busquedaHistorial, setBusquedaHistorial] = useState('');
  const [fechaConsulta, setFechaConsulta] = useState(getFechaPeru());
  const [cliente, setCliente] = useState('');
  const [localidad, setLocalidad] = useState(''); 
  const [telefono, setTelefono] = useState(''); 
  const [tipoVenta, setTipoVenta] = useState('Mayor'); 
  const [cantidades, setCantidades] = useState({}); 
  const [coloresElegidos, setColoresElegidos] = useState({});
  const [carrito, setCarrito] = useState([]);
  const [descuento, setDescuento] = useState(0); 

  const [formProd, setFormProd] = useState({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
  const [formFinanzas, setFormFinanzas] = useState({ tipo: 'Gasto Local', descripcion: '', monto: '', origen: 'Caja Global' });
  const [formEditStockBJ, setFormEditStockBJ] = useState({}); 

  const [idEditFinanza, setIdEditFinanza] = useState(null);
  const [formEditFinanza, setFormEditFinanza] = useState({});
  const [idEditProducto, setIdEditProducto] = useState(null);
  const [formEditProducto, setFormEditProducto] = useState({});

  // [BLOQUE C: ESTILOS Y COLORES BJ]
  const FUCSIA_PRINCIPAL = '#F01097';
  const VERDE_BJ = '#16A34A';
  const ROJO_BJ = '#E11D48'; // <-- Verifica que esta línea exista
  const AMARILLO_BJ = '#CA8A04';
  const OSCURO_BJ = '#1E1B1C';
  const styleInp = { padding: '16px', borderRadius: '16px', border: `2px solid #FCC2E2`, width: '100%', outline: 'none', fontSize: '15px', boxSizing: 'border-box', backgroundColor: '#fff' };
  const styleCrd = { backgroundColor: '#ffffff', borderRadius: '35px', padding: '35px', boxShadow: `0 20px 40px rgba(247, 134, 193, 0.1)`, border: '1px solid #FFF1F2' };
  // [BLOQUE D: LÓGICA DE DATOS]
  useEffect(() => {
    setHasMounted(true);
    cargarTodoDesdeNube();
  }, []);

  const cargarTodoDesdeNube = async () => {
    try {
        const { data: p } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
        const { data: v } = await supabase.from('ventas').select('*').order('created_at', { ascending: true });
        const { data: f } = await supabase.from('finanzas').select('*').order('created_at', { ascending: false });
        if (p) setProductos(p); if (v) setVentas(v); if (f) setFinanzas(f);
    } catch (e) { console.error("BJ Sync Error:", e); } finally { setCargando(false); }
  };

 // [BLOQUE E: CÁLCULOS ESTRATÉGICOS - CORRECCIÓN DE CAJA v1.1]
  const balanceEliteBJ = useMemo(() => {
    const s = { cH: 0, gH: 0, cG: 0, bR: 0, pe_p: 0, pe_g: 0, pe_m: 0 };
    if (!ventas.length && !finanzas.length) return s;
    
    const hoyS = getFechaPeru();
    const mesI = hoyS.substring(0,7);
    
    // --- 1. LÓGICA DE CAJA ACTUAL FÍSICA (SIN ERRORES DE EXCLUSIÓN) ---

    // A. Ventas Directas (Efectivo/Almacén): 
    // Solo sumamos el total si NO es una venta que nació como crédito (identificada por su abono en finanzas)
    const ventasEfectivoDirecto = ventas.filter(v => {
        if (v.estado_pedido === 'Pendiente de Pago') return false;
        
        // Buscamos si esta venta específica tiene un abono registrado (mismo cliente y mismo minuto)
        const tieneAbonoInicial = finanzas.some(f => 
            f.descripcion === `Abono inicial venta crédito: ${v.cliente_nombre}` && 
            v.created_at.substring(0,16) === f.created_at.substring(0,16)
        );
        
        return !tieneAbonoInicial; // Si no tiene abono, es dinero fresco que entró directo
    }).reduce((acc, v) => acc + (Number(v.precio_venta_unitario) * v.cantidad), 0);

    // B. Dinero de Finanzas:
    // Sumamos TODO lo que entró por el Libro Diario (Abonos de créditos, Saldos liquidados y Capital)
    const dineroEntranteFinanzas = finanzas.filter(f => 
        ['Ingreso Adicional', 'Inversión Inicial'].includes(f.tipo)
    ).reduce((acc, f) => acc + Number(f.monto), 0);

    // C. Gastos y Retiros:
    const totalSalidas = finanzas.filter(f => 
        !['Ingreso Adicional', 'Inversión Inicial'].includes(f.tipo)
    ).reduce((acc, f) => acc + Number(f.monto), 0);

    // FÓRMULA FINAL DE CAJA (Ventas Directas + Todo lo de Finanzas - Gastos)
    const cajaFisicaMano = (ventasEfectivoDirecto + dineroEntranteFinanzas) - totalSalidas;


    // --- 2. RESTO DE INDICADORES ---
    
    // Ventas del Día (Solo lo cobrado hoy)
    const vHoy = ventas.filter(v => getFechaPeru(v.created_at) === hoyS && v.estado_pedido !== 'Pendiente de Pago');
    
    // Utilidad Neta Total
    const utTotalAcum = ventas.reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0);
    const retirosVault = finanzas.filter(f => f.origen === 'Ganancias').reduce((acc, f) => acc + Number(f.monto), 0);
    
    // Punto de Equilibrio
    const utMes = ventas.filter(v => getFechaPeru(v.created_at).substring(0,7) === mesI && v.estado_pedido !== 'Pendiente de Pago').reduce((acc, v) => acc + Number(v.ganancia_total), 0);
    const gastoMes = finanzas.filter(f => getFechaPeru(f.created_at).substring(0,7) === mesI && ['Gasto Local','Retiro Personal'].includes(f.tipo)).reduce((acc, f) => acc + Number(f.monto), 0);
    
    return {
        cH: vHoy.reduce((acc, v) => acc + (Number(v.precio_venta_unitario)*v.cantidad), 0),
        gH: vHoy.reduce((acc, v) => acc + Number(v.ganancia_total), 0),
        cG: cajaFisicaMano,
        bR: utTotalAcum - retirosVault,
        pe_p: gastoMes > 0 ? (utMes / gastoMes) * 100 : (utMes > 0 ? 100 : 0), pe_g: utMes, pe_m: gastoMes
    };
  }, [ventas, finanzas]);

  const valorizacionStockBJ = useMemo(() => {
    let cost = 0; let vent = 0;
    productos.forEach(p => { if (Number(p.stock) > 0) { cost += (Number(p.precio_compra || 0) * p.stock); vent += (Number(p.precio_venta || 0) * p.stock); } });
    return { cost, vent };
  }, [productos]);

  const analiticaProBJ = useMemo(() => {
    const c = {}; 
    ventas.forEach(v => { 
        if(v.estado_pedido !== 'Anulado') {
            const n = productos?.find(p => p.id === v.producto_id)?.nombre || "Modelo"; 
            c[n] = (c[n] || 0) + v.cantidad; 
        }
    });
    return { top: Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,5) };
  }, [ventas, productos]);

  const logisticaInteligente = useMemo(() => {
    const res = { almacen: [], deudas: [] };
    const mA = {}; const mD = {};
    ventas.forEach(v => {
        const key = `${v.cliente_nombre}-${v.localidad}`;
        const pM = productos?.find(p => p.id === v.producto_id);
        const it = { id: v.id, nombre: pM?.nombre, cantidad: v.cantidad, color: v.color, subtotal: (v.precio_venta_unitario * v.cantidad) };
        if (v.estado_pedido === 'En Almacén') { 
            if(!mA[key]) mA[key]={cliente:v.cliente_nombre, localidad:v.localidad, items:[], items_ids:[], total:0}; 
            mA[key].items.push(it); mA[key].items_ids.push(v.id); mA[key].total += it.subtotal; 
        }
        if (v.estado_pedido === 'Pendiente de Pago') { 
            if(!mD[key]) mD[key]={cliente:v.cliente_nombre, localidad:v.localidad, items:[], items_ids:[], total:0}; 
            mD[key].items.push(it); mD[key].items_ids.push(v.id); mD[key].total += it.subtotal; 
        }
    });
    res.almacen = Object.values(mA); res.deudas = Object.values(mD);
    return res;
  }, [ventas, productos]);

  const historialVentasDiaBJ = useMemo(() => {
    if (!ventas.length) return [];
    const filt = ventas.filter(v => 
        getFechaPeru(v.created_at) === fechaConsulta && 
        (v.cliente_nombre?.toLowerCase().includes(busquedaHistorial.toLowerCase()) || v.localidad?.toLowerCase().includes(busquedaHistorial.toLowerCase()))
    );
    const groups = {};
    filt.forEach(v => {
        const hId = `${v.cliente_nombre}-${v.localidad}-${v.created_at?.substring(0,16)}`; 
        if (!groups[hId]) groups[hId] = { id_grupo: hId, cliente_nombre: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, hora: getHoraPeru(v.created_at), total: 0, items: [] };
        groups[hId].items.push(v); groups[hId].total += (Number(v.precio_venta_unitario) * v.cantidad);
    });
    return Object.values(groups).reverse();
  }, [ventas, fechaConsulta, busquedaHistorial]);

  // [BLOQUE F: MANEJADORES]
  // Función de Venta: Ahora recibe abonoInicial
  const handleEjecutarVentaBJ = async (estado, abonoInicial = 0) => {
    if (!cliente || !localidad) return alert("Faltan datos de cliente o zona.");
    const totalV = carrito.reduce((acc, i) => acc + (Number(i.precio_venta)*i.cantidad), 0);
    const ratio = totalV > 0 ? (Number(descuento)/totalV) : 0;
    
    const timestamp = new Date().toISOString(); // Creamos una marca de tiempo única para el cruce

    const lista = carrito.map(i => {
        let g = 0; 
        if(Number(i.precio_venta) > 0) { 
            g = (Number(i.precio_venta)*i.cantidad - (Number(i.precio_venta)*i.cantidad*ratio)) - (Number(i.precio_compra)*i.cantidad); 
        }
        return { 
            cliente_nombre: cliente, localidad, telefono, producto_id: i.producto_id, 
            cantidad: i.cantidad, color: i.color, precio_venta_unitario: i.precio_venta, 
            precio_costo_unitario: i.precio_compra, ganancia_total: g, 
            estado_pedido: estado,
            created_at: timestamp // Sincronizamos la venta
        };
    });

    const { error } = await supabase.from('ventas').insert(lista);
    if (!error) {
        if (estado === 'Pendiente de Pago' && Number(abonoInicial) > 0) {
            await supabase.from('finanzas').insert([{
                tipo: 'Ingreso Adicional',
                descripcion: `Abono inicial venta crédito: ${cliente}`,
                monto: Number(abonoInicial),
                origen: 'Caja Global',
                created_at: timestamp // Sincronizamos el abono con la venta
            }]);
        }
        for (const it of carrito) {
            const pO = productos.find(p => p.id === it.producto_id);
            if (pO) await supabase.from('productos').update({ stock: pO.stock - it.cantidad }).eq('id', it.producto_id);
        }
        setCarrito([]); setCliente(''); setLocalidad(''); setTelefono(''); setDescuento(0);
        cargarTodoDesdeNube();
        alert("✅ Operación registrada.");
    }
  };
 const handleCobrarDeudaBJ = async (grupo, montoFinal) => {
    if(confirm(`¿Confirmar cobro de saldo pendiente S/ ${Number(montoFinal).toFixed(2)}?`)) {
        // 1. Cambiamos el estado de los artículos a Entregado
        for(let id of grupo.items_ids) {
            await supabase.from('ventas').update({ estado_pedido: 'Entregado' }).eq('id', id);
        }
        
        // 2. Registramos el ingreso en Finanzas con descripción ESTRUCTURADA
        if(Number(montoFinal) > 0) {
            await supabase.from('finanzas').insert([{ 
                tipo: 'Ingreso Adicional', 
                descripcion: `Saldo liquidado deuda: ${grupo.cliente}`, // <--- NO CAMBIAR ESTE TEXTO
                monto: Number(montoFinal), 
                origen: 'Caja Global' 
            }]);
        }
        cargarTodoDesdeNube();
        alert("💰 Saldo ingresado al Libro Diario.");
    }
  };
// --- NUEVA FUNCIÓN PARA ANULAR CRÉDITOS (Bunker BJ v1.1) ---
  const handleAnularCreditoBJ = async (grupo) => {
    if (confirm(`⚠️ ¿ANULAR CRÉDITO DE ${grupo.cliente}?\n\nSe devolverá el stock al almacén y se ELIMINARÁ el abono de la caja.`)) {
      try {
        // 1. Borrar abono del Libro Diario (Finanzas)
        const { data: abono } = await supabase.from('finanzas').select('id')
          .ilike('descripcion', `%Abono inicial venta crédito: ${grupo.cliente}%`)
          .order('created_at', { ascending: false }).limit(1);

        if (abono && abono.length > 0) {
          await supabase.from('finanzas').delete().eq('id', abono[0].id);
        }

        // 2. Devolver Stock
        for (const it of grupo.items) {
          const pOrig = productos.find(p => p.id === it.producto_id);
          if (pOrig) {
            await supabase.from('productos').update({ stock: pOrig.stock + it.cantidad }).eq('id', pOrig.id);
          }
        }

        // 3. Borrar registros de venta
        await supabase.from('ventas').delete().in('id', grupo.items_ids);

        alert("🗑️ Crédito eliminado. Caja y Stock restaurados.");
        cargarTodoDesdeNube();
      } catch (e) { alert("Error: " + e.message); }
    }
  };
  const handleAutocompleteCliente = (e) => {
    const v = e.target.value; setCliente(v);
    const m = ventas?.find(x => x.cliente_nombre?.toLowerCase() === v.toLowerCase());
    if (m) { setLocalidad(m.localidad || ''); setTelefono(m.telefono || ''); }
  };

  const handleExportarExcelCajaFull = () => {
    let csv = "BJ IMPORTACIONES - REPORTE " + fechaConsulta + "\n";
    csv += `CAJA FISICA MANO,S/ ${balanceEliteBJ.cG.toFixed(2)}\n\n`;
    csv += "Hora,Cliente,Producto,Cant,Subtotal\n";
    ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta).forEach(v => {
      const nP = productos.find(p=>p.id===v.producto_id)?.nombre || "Modelo";
      csv += `${getHoraPeru(v.created_at)},${v.cliente_nombre},${nP},${v.cantidad},${(v.precio_venta_unitario*v.cantidad).toFixed(2)}\n`;
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `BJ_REPORTE_${fechaConsulta}.csv`; link.click();
  };
// --- FUNCIONES DE EDICIÓN EN LOGÍSTICA (Bunker BJ v1.2) ---

  const handleUpdateItemLogistica = async (idVenta, dataNueva, idProductoAnterior, cantAnterior) => {
    try {
      // 1. Si cambió la cantidad o el producto, ajustamos stock
      if (dataNueva.producto_id !== idProductoAnterior || dataNueva.cantidad !== cantAnterior) {
        // Devolvemos lo anterior
        const pAnt = productos.find(p => p.id === idProductoAnterior);
        if (pAnt) await supabase.from('productos').update({ stock: pAnt.stock + Number(cantAnterior) }).eq('id', pAnt.id);
        
        // Quitamos lo nuevo
        const pNue = productos.find(p => p.id === dataNueva.producto_id);
        if (pNue) await supabase.from('productos').update({ stock: pNue.stock - Number(dataNueva.cantidad) }).eq('id', pNue.id);
      }

      // 2. Actualizamos la fila en Ventas
      await supabase.from('ventas').update(dataNueva).eq('id', idVenta);
      
      alert("✅ Ítem actualizado.");
      cargarTodoDesdeNube();
    } catch (e) { alert("Error: " + e.message); }
  };

  const handleEliminarItemIndividualLogistica = async (v) => {
    if (confirm(`¿Eliminar ${v.nombre} de este pedido? Se devolverá el stock.`)) {
      const pOrig = productos.find(p => p.id === v.producto_id);
      if (pOrig) await supabase.from('productos').update({ stock: pOrig.stock + v.cantidad }).eq('id', pOrig.id);
      
      await supabase.from('ventas').delete().eq('id', v.id);
      cargarTodoDesdeNube();
    }
  };
  // --- FUNCIÓN: ANULAR VENTA DESDE HISTORIAL (Bunker BJ v1.2) ---
  const handleAnularVentaBJ = async (v) => {
    if (confirm(`¿Anular venta de ${v.cantidad} unidades? \n\nSe devolverá el stock y se RESTARÁ el dinero de la caja física.`)) {
      try {
        // 1. DEVOLVER EL STOCK
        const pOrig = productos.find(p => p.id === v.producto_id);
        if (pOrig) {
          await supabase.from('productos')
            .update({ stock: pOrig.stock + v.cantidad })
            .eq('id', pOrig.id);
        }

        // 2. LIMPIAR CAJA (Borrar el ingreso en Finanzas)
        // Buscamos un registro que coincida en monto, cliente y tiempo (minuto)
        const { data: finanzaABorrar } = await supabase
          .from('finanzas')
          .select('id')
          .eq('monto', (v.precio_venta_unitario * v.cantidad))
          .ilike('descripcion', `%${v.cliente_nombre}%`)
          .order('created_at', { ascending: false })
          .limit(1);

        if (finanzaABorrar && finanzaABorrar.length > 0) {
          await supabase.from('finanzas').delete().eq('id', finanzaABorrar[0].id);
        }

        // 3. ELIMINAR LA VENTA
        await supabase.from('ventas').delete().eq('id', v.id);

        alert("🗑️ Venta anulada. Stock y Caja restaurados.");
        cargarTodoDesdeNube();
      } catch (e) {
        alert("Error al anular: " + e.message);
      }
    }
  };
  // [BLOQUE G: RENDER]
  if (!hasMounted) return null;
  if (cargando) return <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', backgroundColor:'#FFF5F7', color:FUCSIA_PRINCIPAL, fontWeight:'900' }}>BUNKER BJ v106.1... 🚀</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF5F7', color: OSCURO_BJ, fontFamily: 'system-ui, sans-serif' }}>
      
      <header style={{ backgroundColor: '#ffffff', padding: '15px 5%', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 4px 15px rgba(0,0,0,0.06)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', width: '45px', height: '45px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' }}>BJ</div>
          <div><h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>BJ IMPORTACIONES</h1><small style={{ color: '#64748B', fontWeight: '900', fontSize: '9px' }}>v106.1 STABLE</small></div>
        </div>
        <nav style={{ display: 'flex', gap: '8px', backgroundColor: `#FCA5D415`, padding: '5px', borderRadius: '15px', flexWrap:'wrap' }}>
          {['ventas', 'stock', 'logistica', 'contabilidad'].map((tab) => (
            <button key={tab} onClick={() => setVista(tab)} style={{ backgroundColor: vista === tab ? (tab === 'logistica' ? OSCURO_BJ : FUCSIA_PRINCIPAL) : 'transparent', border: 'none', color: vista === tab ? '#fff' : (tab === 'logistica' ? OSCURO_BJ : FUCSIA_PRINCIPAL), padding: '10px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: '900', textTransform: 'uppercase' }}>
              {tab === 'contabilidad' ? 'GESTIÓN' : (tab === 'stock' ? 'ALMACÉN' : tab)}
            </button>
          ))}
        </nav>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '30px 20px' }}>
        {vista === 'ventas' && (
  <VentasSection {...{ 
    balanceEliteBJ, 
    fechaConsulta, 
    setFechaConsulta, 
    handleExportarExcelCajaFull, 
    tipoVenta, 
    setTipoVenta, 
    cliente, 
    handleAutocompleteCliente, 
    ventas, 
    localidad, 
    setLocalidad, 
    telefono, 
    setTelefono, 
    carrito, 
    setCarrito, 
    descuento, 
    setDescuento, 
    handleEjecutarVentaBJ, 
    busqueda, 
    setBusqueda, 
    productos, 
    coloresElegidos, 
    setColoresElegidos, 
    cantidades, 
    setCantidades, 
    busquedaHistorial, 
    setBusquedaHistorial, 
    historialVentasDiaBJ, 
    handleAnularVentaBJ,
    analiticaProBJ, // <--- ESTE ES EL NUEVO PROP PARA LOS FILTROS
    FUCSIA_PRINCIPAL, 
    VERDE_BJ, 
    ROJO_BJ, 
    AMARILLO_BJ, 
    OSCURO_BJ, 
    styleInp, 
    styleCrd 
  }} />
)}
        {vista === 'stock' && (
  <AlmacenSection {...{
    formProd, 
    setFormProd, 
    // AGREGAR PRODUCTO (CON TODOS LOS CAMPOS)
    handleAddProductoBJ: async (e) => { 
        e.preventDefault(); 
        const { error } = await supabase.from('productos').insert([{ 
            ...formProd, 
            precio_compra: Number(handleInputMonto(formProd.precio_compra)), 
            precio_venta: Number(handleInputMonto(formProd.precio_venta)), 
            precio_menor: Number(handleInputMonto(formProd.precio_menor)),
            stock: Number(formProd.stock)
        }]); 
        if(!error){ 
            setFormProd({nombre:'', precio_compra:'', precio_venta:'', precio_menor:'', stock:'', colores:''}); 
            cargarTodoDesdeNube(); 
            alert("✨ Modelo añadido al catálogo.");
        } 
    },
    busquedaStock, 
    setBusquedaStock, 
    productos, 
    idEditProducto, 
    setIdEditProducto, 
    formEditProducto, 
    setFormEditProducto,
    // ACTUALIZAR PRODUCTO (EDICIÓN TOTAL v106.5)
    handleUpdateProductoBJ: async (id) => { 
        const { error } = await supabase.from('productos').update({
            nombre: formEditProducto.nombre,
            precio_compra: Number(formEditProducto.precio_compra),
            precio_venta: Number(formEditProducto.precio_venta),
            precio_menor: Number(formEditProducto.precio_menor),
            stock: Number(formEditProducto.stock)
        }).eq('id', id);
        
        if(!error){
            setIdEditProducto(null); 
            cargarTodoDesdeNube(); 
            alert("✅ Producto actualizado correctamente.");
        } else {
            alert("Error al actualizar: " + error.message);
        }
    },
    handleDeleteProductoBJ: async (id, nom) => { 
        if(confirm(`¿Estás seguro de eliminar ${nom}?`)){ 
            const { error } = await supabase.from('productos').delete().eq('id', id); 
            if(!error) cargarTodoDesdeNube();
            else alert("No se puede eliminar: tiene ventas registradas.");
        } 
    },
    formEditStockBJ, 
    setFormEditStockBJ, 
    handleSincronizarStockBJ: async (id, s) => { 
        const { error } = await supabase.from('productos').update({ stock: Number(s) }).eq('id', id); 
        if(!error) {
            cargarTodoDesdeNube(); 
            alert("✅ Stock sincronizado."); 
        }
    },
    FUCSIA_PRINCIPAL, 
    VERDE_BJ, 
    ROJO_BJ, 
    OSCURO_BJ, 
    styleInp, 
    styleCrd
  }} />
)}
        {/* BUSCA ESTA PARTE EN EL MAIN Y REEMPLÁZALA */}
        {vista === 'logistica' && (
          <LogisticaSection {...{ 
            logisticaInteligente, 
            handleCobrarDeudaBJ, 
            handleAnularCreditoBJ,
            handleUpdateItemLogistica, // <--- NUEVA
            handleEliminarItemIndividualLogistica, // <--- NUEVA
            productos,
            finanzas, 
            FUCSIA_PRINCIPAL, VERDE_BJ, AMARILLO_BJ, ROJO_BJ, OSCURO_BJ, 
            styleCrd, styleInp 
          }} />
        )}
        {vista === 'contabilidad' && <GestionSection {...{ balanceEliteBJ, valorizacionStockBJ, analiticaProBJ, finanzas, idEditFinanza, setIdEditFinanza, formEditFinanza, setFormEditFinanza, handleUpdateFinanzaBJ: async (id) => { await supabase.from('finanzas').update(formEditFinanza).eq('id', id); setIdEditFinanza(null); cargarTodoDesdeNube(); }, formFinanzas, setFormFinanzas, handleRegistrarFinanzaBJ: async (e) => { e.preventDefault(); await supabase.from('finanzas').insert([{ ...formFinanzas, monto: Number(handleInputMonto(formFinanzas.monto)) }]); setFormFinanzas({tipo:'Gasto Local', descripcion:'', monto:'', origen:'Caja Global'}); cargarTodoDesdeNube(); }, FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd }} />}
      </main>
    </div>
  );
}