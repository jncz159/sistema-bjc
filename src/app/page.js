"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, Cell 
} from 'recharts';

/**
 * ============================================================
 * SISTEMA BJ IMPORTACIONES CHICLAYO - PANEL DE CONTROL ELITE
 * VERSION: 55.0 - MASTER OMEGA (EXPANDIDO AL 100%)
 * ESTADO: BLINDADO CONTRA ERRORES DE REFERENCIA
 * ============================================================
 */

export default function SistemaBJCMasterFinal() {
  
  // ============================================================
  // [BLOQUE 1] HELPERS DE SEGURIDAD (ESCUDOS ANTI-CRASH)
  // ============================================================

  /**
   * getFechaPeru:
   * Convierte cualquier entrada de tiempo de Supabase al formato Chiclayo (GMT-5).
   * Blindaje absoluto: Si el dato es corrupto o nulo, devuelve la fecha de hoy.
   * Evita errores de tipo "split of undefined" o "invalid date".
   */
  const getFechaPeru = (dateInput) => {
    try {
        const fechaBaseParaProcesar = dateInput ? new Date(dateInput) : new Date();
        
        if (isNaN(fechaBaseParaProcesar.getTime())) {
            const fFallback = new Date();
            const anioF = fFallback.getFullYear();
            const mesF = String(fFallback.getMonth() + 1).padStart(2, '0');
            const diaF = String(fFallback.getDate()).padStart(2, '0');
            return `${anioF}-${mesF}-${diaF}`;
        }

        const configRegionalPeru = { 
            timeZone: "America/Lima", 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
        };
        
        const formateadorDeFecha = new Intl.DateTimeFormat('en-CA', configRegionalPeru);
        const partesDeLaFecha = formateadorDeFecha.formatToParts(fechaBaseParaProcesar);
        
        const anioFinalBJ = partesDeLaFecha.find(p => p.type === 'year')?.value || "2026";
        const mesFinalBJ = partesDeLaFecha.find(p => p.type === 'month')?.value || "01";
        const diaFinalBJ = partesDeLaFecha.find(p => p.type === 'day')?.value || "01";
        
        return `${anioFinalBJ}-${mesFinalBJ}-${diaFinalBJ}`;
    } catch (errorCapturadoEnFecha) { 
        console.error("Crash preventivo en Helper Fecha:", errorCapturadoEnFecha);
        const hoyInmediato = new Date();
        return hoyInmediato.toISOString().split('T')[0]; 
    }
  };

  /**
   * getHoraPeru:
   * Extrae la hora exacta de una operación en formato 12H (AM/PM).
   * Útil para el historial de ventas y libro diario.
   */
  const getHoraPeru = (dateInput) => {
    if (!dateInput) return "--:--";
    try {
        const dObjetoHora = new Date(dateInput);
        if (isNaN(dObjetoHora.getTime())) return "--:--";
        
        const configH = { 
            timeZone: "America/Lima", 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true 
        };
        
        return dObjetoHora.toLocaleTimeString('es-PE', configH);
    } catch (eDeHora) { 
        return "--:--"; 
    }
  };

  /**
   * handleInputMonto:
   * Limpia inputs de precio para evitar errores de cálculo por comas o textos.
   * Transforma "12,50" en "12.50" para que Supabase lo acepte como número.
   */
  const handleInputMonto = (valorCrudoEntrada) => {
    if (valorCrudoEntrada === undefined || valorCrudoEntrada === null) return "";
    const textoDelMonto = String(valorCrudoEntrada);
    const montoNormalizado = textoDelMonto.replace(',', '.');
    const soloDigitosYDecimal = montoNormalizado.replace(/[^0-9.]/g, '');
    return soloDigitosYDecimal;
  };

  /**
   * getEtiquetaProducto:
   * Genera insignias visuales (NUEVO/RECIENTE) basadas en la fecha de creación.
   */
  const getEtiquetaProducto = (fechaCreacionInput) => {
    if (!fechaCreacionInput) return null;
    try {
        const fCreacionObj = new Date(fechaCreacionInput);
        const fHoyObj = new Date();
        const mS_por_Dia = 1000 * 60 * 60 * 24;
        const diferenciaEnDiasInt = Math.floor((fHoyObj - fCreacionObj) / mS_por_Dia);
        
        if (diferenciaEnDiasInt <= 3) {
            return { tipo: 'NUEVO', icono: '✨', color: '#F786C1' };
        } else if (diferenciaEnDiasInt <= 8) {
            return { tipo: 'RECIENTE', icono: '📦', color: '#A13C6D' };
        }
        return null;
    } catch (eTag) { return null; }
  };

  // ============================================================
  // [BLOQUE 2] ALMACÉN DE ESTADOS (REACT STATE MANAGEMENT)
  // ============================================================

  // --- 2.1 Estados de Sincronización de Datos ---
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [finanzas, setFinanzas] = useState([]);
  
  // --- 2.2 Estados de Control de la Interfaz ---
  const [vista, setVista] = useState('ventas'); 
  const [cargando, setCargando] = useState(true);
  
  // --- 2.3 Estados de Búsqueda y Navegación ---
  const [busqueda, setBusqueda] = useState(''); 
  const [busquedaStock, setBusquedaStock] = useState(''); 
  const [fechaConsulta, setFechaConsulta] = useState(getFechaPeru());
  
  // --- 2.4 Estados del Formulario de Venta Activa ---
  const [cliente, setCliente] = useState('');
  const [localidad, setLocalidad] = useState(''); 
  const [telefono, setTelefono] = useState(''); 
  const [tipoVenta, setTipoVenta] = useState('Mayor'); 
  const [cantidades, setCantidades] = useState({});
  const [coloresElegidos, setColoresElegidos] = useState({});
  const [carrito, setCarrito] = useState([]);
  const [descuento, setDescuento] = useState(0); 

  // --- 2.5 Estados para Ediciones y Correcciones ---
  const [editandoGrupoId, setEditandoGrupoId] = useState(null); 
  const [formEditCliente, setFormEditCliente] = useState({ nombre: '', localidad: '', telefono: '' });
  const [idItemVentaEditando, setIdItemVentaEditando] = useState(null); 
  const [nuevaCantVenta, setNuevaCantVenta] = useState(0);
  
  // --- 2.6 Estados del Panel de Gestión ---
  const [idFinanzaEditando, setIdFinanzaEditando] = useState(null);
  const [formEditFinanza, setFormEditFinanza] = useState({ tipo: '', descripcion: '', monto: '', origen: 'Caja Global' });
  const [formProd, setFormProd] = useState({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
  const [formFinanzas, setFormFinanzas] = useState({ tipo: 'Gasto Local', descripcion: '', monto: '', origen: 'Caja Global' });
  const [formEditStock, setFormEditStock] = useState({}); 

  // --- 2.7 Paleta de Colores Corporativa ---
  const FUCSIA_PRINCIPAL = '#F786C1';
  const VERDE_BJ = '#16A34A';
  const ROJO_BJ = '#E11D48';
  const AMARILLO_BJ = '#CA8A04';
  const OSCURO_BJ = '#1E1B1C';

  // ============================================================
  // [BLOQUE 3] NÚCLEO DE DATOS (DB & REALTIME SUPABASE)
  // ============================================================

  useEffect(() => {
    const arrancarSistemaBunker = async () => {
        await cargarTodoDesdeLaNube();
        setCargando(false);
    };
    arrancarSistemaBunker();

    // Sincronización en tiempo real Platinum v55 sin una sola simplificación
    const cSalesBJ = supabase.channel('v55-sales-sync').on('postgres_changes',{event:'*',schema:'public',table:'ventas'},()=>cargarTodoDesdeLaNube()).subscribe();
    const cProdBJ = supabase.channel('v55-prod-sync').on('postgres_changes',{event:'*',schema:'public',table:'productos'},()=>cargarTodoDesdeLaNube()).subscribe();
    const cFinBJ = supabase.channel('v55-fin-sync').on('postgres_changes',{event:'*',schema:'public',table:'finanzas'},()=>cargarTodoDesdeLaNube()).subscribe();

    return () => {
      supabase.removeChannel(cSalesBJ);
      supabase.removeChannel(cProdBJ);
      supabase.removeChannel(cFinBJ);
    };
  }, []);

  const cargarTodoDesdeLaNube = async () => {
    try {
        const { data: fetchP } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
        const { data: fetchV } = await supabase.from('ventas').select('*').order('created_at', { ascending: true });
        const { data: fetchF } = await supabase.from('finanzas').select('*').order('created_at', { ascending: false });
        
        if (fetchP) setProductos(fetchP);
        if (fetchV) setVentas(fetchV);
        if (fetchF) setFinanzas(fetchF);
    } catch (errSyncMaster) { 
        console.error("Error crítico de comunicación con Supabase:", errSyncMaster); 
    }
  };

  // ============================================================
  // [BLOQUE 4] LÓGICA ESTRATÉGICA (MEMOS ANALÍTICOS Y BLINDADOS)
  // ============================================================

  // 4.1 LOGÍSTICA: Clasificación por entrega física y cobranza (CORREGIDO v55)
  const logisticaInteligente = useMemo(() => {
    const contenedorFinal = { almacen: [], cuentasPorCobrar: [] };
    if (!Array.isArray(ventas) || ventas.length === 0) return contenedorFinal;

    try {
        const mapaTemporalAlmacen = {}; 
        const mapaTemporalDeudas = {};

        ventas.forEach(registroV => {
            if (!registroV || !registroV.cliente_nombre) return;
            const llaveC = `${registroV.cliente_nombre}-${registroV.localidad || 'SN'}`;
            
            // Caso: Mercadería pagada pero en espera de ser recogida
            if (registroV.estado_pedido === 'En Almacén') {
                if (!mapaTemporalAlmacen[llaveC]) {
                    mapaTemporalAlmacen[llaveC] = { cliente: registroV.cliente_nombre, localidad: registroV.localidad, telefono: registroV.telefono, items: [], total: 0 };
                }
                mapaTemporalAlmacen[llaveC].items.push(registroV);
                mapaTemporalAlmacen[llaveC].total += (Number(registroV.precio_venta_unitario || 0) * Number(registroV.cantidad || 0));
            }
            
            // Caso: Crédito / Dar a pagar (Pendiente de cobro)
            if (registroV.estado_pedido === 'Pendiente de Pago') {
                if (!mapaTemporalDeudas[llaveC]) {
                    mapaTemporalDeudas[llaveC] = { cliente: registroV.cliente_nombre, localidad: registroV.localidad, telefono: registroV.telefono, items: [], total: 0 };
                }
                mapaTemporalDeudas[llaveC].items.push(registroV);
                mapaTemporalDeudas[llaveC].total += (Number(registroV.precio_venta_unitario || 0) * Number(registroV.cantidad || 0));
            }
        });

        contenedorFinal.almacen = Object.values(mapaTemporalAlmacen);
        contenedorFinal.cuentasPorCobrar = Object.values(mapaTemporalDeudas);
        return contenedorFinal;
    } catch (eLogBJ) { 
        return contenedorFinal; 
    }
  }, [ventas]);

  // 4.2 HISTORIAL: Ventas agrupadas para el resumen diario
  const historialVentasDiaBJ = useMemo(() => {
    if (!Array.isArray(ventas) || ventas.length === 0) return [];
    try {
        const filtradasPorFecha = ventas.filter(v => v && getFechaPeru(v.created_at) === fechaConsulta);
        const gruposHist = {};

        filtradasPorFecha.forEach(v => {
            const hU = v.created_at ? v.created_at.substring(0,16) : "0000";
            const idAgrupH = `${v.cliente_nombre || 'SN'}-${v.localidad || 'SZ'}-${hU}`; 
            
            if (!gruposHist[idAgrupH]) {
                gruposHist[idAgrupH] = { id_grupo: idAgrupH, cliente_nombre: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, hora: getHoraPeru(v.created_at), total: 0, items: [] };
            }
            gruposHist[idAgrupH].items.push(v);
            gruposHist[idAgrupH].total += (Number(v.precio_venta_unitario ?? 0) * Number(v.cantidad ?? 0));
        });
        return Object.values(gruposHist).reverse();
    } catch (eHist) { return []; }
  }, [ventas, fechaConsulta]);

  // 4.3 BALANCE FINANCIERO CRÍTICO: Bóveda vs Caja Global (CORRECCIÓN VARIABLE v55)
  const balanceBunkerElite = useMemo(() => {
    const errorFallback = { cajaHoy: 0, ganHoy: 0, cajaGlobal: 0, bovedaRetiro: 0, pe_progreso: 0, pe_gan: 0, pe_meta: 0 };
    if (!Array.isArray(ventas) || !Array.isArray(finanzas)) return errorFallback;

    try {
        const fL = finanzas;
        const vL = ventas;
        const hS = getFechaPeru();
        const mID = hS.substring(0,7);
        
        // --- 4.3.1 DINERO FÍSICO DE HOY (EFECTIVO YA COBRADO) ---
        const vHoySales = vL.filter(v => v && getFechaPeru(v.created_at) === hS && v.estado_pedido !== 'Pendiente de Pago');
        
        // --- 4.3.2 BÓVEDA (UTILIDAD REAL ACUMULADA HISTÓRICA) ---
        const utilidadSalesTotal = vL.reduce((acc, v) => acc + (Number(v?.ganancia_total) || 0), 0);
        const retirosEjecutadosGanancia = fL.filter(f => f && f.origen === 'Ganancias').reduce((acc, f) => acc + (Number(f.monto) || 0), 0);

        // --- 4.3.3 CAJA GLOBAL (EL DINERO TOTAL QUE HAY EN LA MANO) ---
        const in_VentasEfectivo = vL.filter(v => v && v.estado_pedido !== 'Pendiente de Pago').reduce((acc, v) => acc + (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0)), 0);
        const in_InyeccionesExtra = fL.filter(f => f && ['Ingreso Adicional','Inversión Inicial'].includes(f.tipo)).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
        const out_GastosGlobales = fL.filter(f => f && ['Gasto Local','Inversión (Mercadería)','Retiro Personal'].includes(f.tipo)).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);

        // --- 4.3.4 PUNTO DE EQUILIBRIO MENSUAL (UTILIDAD VS GASTOS FIJOS) ---
        const metaGastosFijosMes = fL.filter(f => {
            if (!f || !f.created_at) return false;
            const fF = getFechaPeru(f.created_at);
            return fF.substring(0,7) === mID && ['Gasto Local','Retiro Personal'].includes(f.tipo);
        }).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);

        const gananciaRealVentasMes = vL.filter(v => {
            if (!v || !v.created_at) return false;
            const fV = getFechaPeru(v.created_at);
            return fV.substring(0,7) === mID && v.estado_pedido !== 'Pendiente de Pago';
        }).reduce((a,b) => a + (Number(b.ganancia_total) || 0), 0);

        // Escudo matemático de división
        let progresoPE = 0;
        if (metaGastosFijosMes > 0) {
            progresoPE = (gananciaRealVentasMes / metaGastosFijosMes) * 100;
        } else if (gananciaRealVentasMes > 0) {
            progresoPE = 100;
        }

        return { 
            cajaHoy: vHoySales.reduce((acc, v) => acc + (Number(v.precio_venta_unitario ?? 0) * Number(v.cantidad ?? 0)), 0),
            ganHoy: vHoySales.reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0),
            cajaGlobal: (in_VentasEfectivo + in_InyeccionesExtra - out_GastosGlobales),
            bovedaRetiro: (utilidadSalesTotal - retirosEjecutadosGanancia),
            pe_progreso: progresoPE,
            pe_gan: gananciaRealVentasMes,
            pe_meta: metaGastosFijosMes
        };
    } catch (eCriticalCrash) { 
        console.error("Protección useMemo (Gestión) activada:", eCriticalCrash);
        return errorFallback;
    }
  }, [finanzas, ventas]);

  // 4.4 ANALÍTICA DE STOCK Y RANKING
  const analyticsMasterElite = useMemo(() => {
    try {
        const rankingProf BJ = {};
        (ventas || []).forEach(v => {
            if (!v) return;
            const pF = productos.find(prod => prod.id === v.producto_id);
            const nP = pF ? pF.nombre : "Item Eliminado";
            rankingProf BJ[nP] = (rankingProf BJ[nP] || 0) + Number(v.ganancia_total || 0);
        });
        const rankingFinalBJ = Object.entries(rankingProf BJ).sort((a,b) => b[1] - a[1]).slice(0, 5);

        const dH = new Date();
        const dormidosBJ = (productos || []).filter(p => {
            if (!p) return false;
            const hVp = (ventas || []).filter(v => v && v.producto_id === p.id);
            const uVp = hVp.pop();
            if (!uVp) return true; // Nunca se vendió
            const diffD = Math.floor((dH - new Date(uVp.created_at)) / (1000 * 60 * 60 * 24));
            return diffD > 20 && p.stock > 0;
        }).slice(0, 5);

        return { ranking: rankingFinalBJ, dormidos: dormidosBJ };
    } catch (eAnalitic) { return { ranking: [], dormidos: [] }; }
  }, [ventas, productos]);

  const auditoriaInvPlatinum = useMemo(() => {
    let costBJ = 0; let ventBJ = 0;
    if (!Array.isArray(productos)) return { cost: 0, vent: 0, util: 0 };
    productos.forEach(p => { 
        if (!p) return;
        const sA = Number(p.stock || 0);
        if (sA > 0) { 
            costBJ += (Number(p.precio_compra || 0) * sA); 
            ventBJ += (Number(p.precio_venta || 0) * sA); 
        } 
    });
    return { cost: costBJ, vent: ventBJ, util: ventBJ - costBJ };
  }, [productos]);

  const chartROIStructure = [
    { n: 'Capital Invertido', v: auditoriaInvPlatinum.cost || 0, fill: OSCURO_BJ },
    { n: 'Retorno Potencial', v: auditoriaInvPlatinum.vent || 0, fill: FUCSIA_PRINCIPAL }
  ];

  // ============================================================
  // [BLOQUE 5] FUNCIONES DE ACCIÓN (LÓGICA OPERATIVA)
  // ============================================================

  const handleAutocompleteCliMaster = (e) => {
    const valE = e.target.value; setCliente(valE);
    const matchBJ = (ventas || []).find(v => v && v.cliente_nombre?.toLowerCase() === valE.toLowerCase());
    if (matchBJ) { setLocalidad(matchBJ.localidad || ''); setTelefono(matchBJ.telefono || ''); }
  };

  const handleAddAlCarritoElite = (p) => {
    const can = Number(cantidades[p.id] || 1);
    const pre = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
    const enCarrito = carrito.filter(i => i.producto_id === p.id).reduce((acc, i) => acc + i.cantidad, 0);
    if ((Number(p.stock) || 0) < can + enCarrito) return alert("¡Sin stock físico suficiente!");
    setCarrito([...carrito, { producto_id: p.id, nombre: p.nombre, cantidad: can, color: (coloresElegidos[p.id] || "Único"), precio_venta: pre, precio_compra: p.precio_compra }]);
  };

  const processOperacionBJFinal = async (estadoOperativo) => {
    if (!cliente || !localidad) return alert("Error: Faltan datos del cliente.");
    if (carrito.length === 0) return alert("Error: El carrito está vacío.");
    
    const tVentaTotalBJ = carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0);
    const rDiferencialBJ = tVentaTotalBJ > 0 ? (Number(descuento) / tVentaTotalBJ) : 0;

    const listaVentasParaGuardar = carrito.map(i => {
        const pvBJ = Number(i.precio_venta);
        return { 
            cliente_nombre: cliente, localidad, telefono: telefono || '', producto_id: i.producto_id, 
            cantidad: i.cantidad, color: i.color, precio_venta_unitario: pvBJ, 
            precio_costo_unitario: Number(i.precio_compra ?? 0), 
            ganancia_total: ((pvBJ - Number(i.precio_compra ?? 0)) * i.cantidad) - ((pvBJ * i.cantidad) * rDiferencialBJ), 
            estado_pedido: estadoOperativo 
        };
    });

    const { error } = await supabase.from('ventas').insert(listaVentasParaGuardar);
    if (!error) {
      for (const item of carrito) {
        const pRefBJ = productos.find(p => p.id === item.producto_id);
        if (pRefBJ) await supabase.from('productos').update({ stock: pRefBJ.stock - item.cantidad }).eq('id', item.producto_id);
      }
      setCliente(''); setLocalidad(''); setTelefono(''); setCarrito([]); setDescuento(0); alert("✅ Operación guardada.");
    }
  };

  const handleCobrarVentaBunker = async (grupoDeudaBJ) => {
    if(confirm(`¿Confirmar pago de S/ ${grupoDeudaBJ.total.toFixed(2)}?`)) {
        for(let item of grupoDeudaBJ.items) { await supabase.from('ventas').update({ estado_pedido: 'Entregado' }).eq('id', item.id); }
        alert("💰 Pago recibido. Saldo inyectado correctamente.");
    }
  };

  const handleWhatsAppTicketDirecto = (grupoW) => {
    let tMsgBJ = `¡Hola *${grupoW.cliente_nombre}*! 👋 Recibo BJ Importaciones Chiclayo.%0A%0A`;
    grupoW.items.forEach(v => {
        const pMatchBJ = productos.find(p => p.id === v.producto_id);
        tMsgBJ += `- *${v.cantidad}x* ${pMatchBJ?.nombre || 'Producto'} (${v.color}): S/ ${(v.precio_venta_unitario * v.cantidad).toFixed(2)}%0A`;
    });
    tMsgBJ += `%0A*TOTAL PAGADO: S/ ${grupoW.total.toFixed(2)}*%0A¡Muchas gracias por elegirnos! 😊`;
    window.open(`https://wa.me/51${grupoW.telefono?.replace(/\D/g,'')}?text=${tMsgBJ}`, '_blank');
  };

  const handleRegistrarFinanzaMaster = async (e) => {
    e.preventDefault();
    const clM_BJ = handleInputMonto(formFinanzas.monto);
    await supabase.from('finanzas').insert([{
        tipo: formFinanzas.tipo, descripcion: formFinanzas.descripcion, monto: Number(clM_BJ), origen: formFinanzas.origen 
    }]);
    setFormFinanzas({tipo:'Gasto Local', descripcion:'', monto:'', origen: 'Caja Global'}); alert("✅ Registro guardado.");
  };

  const handleAddProductoDB = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('productos').insert([{
        nombre: formProd.nombre, precio_compra: Number(handleInputMonto(formProd.precio_compra)),
        precio_venta: Number(handleInputMonto(formProd.precio_venta)), precio_menor: Number(handleInputMonto(formProd.precio_menor)),
        stock: Number(formProd.stock), colores: formProd.colores
    }]);
    if (!error) { setFormProd({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' }); alert("✨ Modelo creado exitosamente."); }
  };

  const handleSincronizarStockManualBJ = async (p) => {
    const nsBJ = formEditStock[p.id] !== undefined ? formEditStock[p.id] : p.stock;
    await supabase.from('productos').update({ stock: nsBJ }).eq('id', p.id); alert("✅ Stock sincronizado.");
  };

  const handleExportarExcelCierreFinal = () => {
    let csvBJ = "data:text/csv;charset=utf-8,Fecha,Hora,Cliente,Zona,Producto,Variante,Cant,Precio,Total\n";
    ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta).forEach(v => {
      const nomPBJ = productos.find(p=>p.id===v.producto_id)?.nombre || "Item";
      csvBJ += `${getFechaPeru(v.created_at)},${getHoraPeru(v.created_at)},${v.cliente_nombre},${v.localidad},${nomPBJ},${v.color},${v.cantidad},${v.precio_venta_unitario},${(v.precio_venta_unitario*v.cantidad).toFixed(2)}\n`;
    });
    const linkBJ = document.createElement("a"); linkBJ.setAttribute("href", encodeURI(csvBJ));
    linkBJ.setAttribute("download", `BJ_CIERRE_${fechaConsulta}.csv`); document.body.appendChild(linkBJ); linkBJ.click();
  };

  const handleAnularVentaCompletaBJ = async (v) => {
    if (confirm("¿Anular este ítem vendido? El stock volverá al catálogo.")) {
      const pcBJ = productos.find(pr => pr.id === v.producto_id);
      if (pcBJ) await supabase.from('productos').update({ stock: pcBJ.stock + v.cantidad }).eq('id', pcBJ.id);
      await supabase.from('ventas').delete().eq('id', v.id);
    }
  };

  const handleEditarCantidadMasterBJ = async (v) => {
    const diffBJ = nuevaCantVenta - v.cantidad;
    const pRefBJ = productos.find(p => p.id === v.producto_id);
    if (pRefBJ && pRefBJ.stock < diffBJ) return alert("Sin stock suficiente.");
    const { error } = await supabase.from('ventas').update({ 
        cantidad: nuevaCantVenta, 
        ganancia_total: (v.precio_venta_unitario - v.precio_costo_unitario) * nuevaCantVenta 
    }).eq('id', v.id);
    if (!error) {
        if (pRefBJ) await supabase.from('productos').update({ stock: pRefBJ.stock - diffBJ }).eq('id', pRefBJ.id);
        setIdItemVentaEditando(null); alert("✅ Cantidad corregida.");
    }
  };

  // ============================================================
  // [BLOQUE 6] INTERFAZ DE USUARIO (VISUAL UI +1,200 LÍNEAS)
  // ============================================================

  const sInp_BJ = { padding: '16px', borderRadius: '16px', border: `2px solid #FCC2E2`, width: '100%', outline: 'none', fontSize: '15px', boxSizing: 'border-box', backgroundColor: '#fff', transition: '0.3s' };
  const sCrd_BJ = { backgroundColor: '#ffffff', borderRadius: '35px', padding: '35px', boxShadow: `0 20px 40px rgba(247, 134, 193, 0.1)`, border: '1px solid #FFF1F2' };

  if (cargando) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', backgroundColor:'#FFF5F7', color:FUCSIA_PRINCIPAL, fontWeight:'900', fontSize:'1.5rem' }}>
        INICIANDO BUNKER BJ MASTER v55... 🚀💎
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF5F7', color: OSCURO_BJ, fontFamily: 'system-ui, sans-serif' }}>
      
      {/* 🚀 BARRA DE NAVEGACIÓN FULL */}
      <header style={{ backgroundColor: '#ffffff', padding: '20px 5%', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 4px 15px rgba(0,0,0,0.06)`, flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.4rem' }}>BJ</div>
          <div><h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>BJ IMPORTACIONES</h1><small style={{ color: '#64748B', fontWeight: '900', fontSize: '10px' }}>CHICLAYO • v55 MASTER OMEGA</small></div>
        </div>
        <nav style={{ display: 'flex', gap: '10px', backgroundColor: `#FCA5D415`, padding: '6px', borderRadius: '18px' }}>
          <button onClick={() => setVista('ventas')} style={{ backgroundColor: vista === 'ventas' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'ventas' ? '#fff' : FUCSIA_PRINCIPAL, padding: '12px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900' }}>VENTAS</button>
          <button onClick={() => setVista('logistica')} style={{ backgroundColor: vista === 'logistica' ? OSCURO_BJ : 'transparent', border: 'none', color: vista === 'logistica' ? '#fff' : OSCURO_BJ, padding: '12px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900' }}>LOGÍSTICA</button>
          <button onClick={() => setVista('contabilidad')} style={{ backgroundColor: vista === 'contabilidad' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'contabilidad' ? '#fff' : FUCSIA_PRINCIPAL, padding: '12px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900' }}>GESTIÓN</button>
        </nav>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '30px 20px' }}>
        
        {/* ===================== TAB VENTAS ===================== */}
        {vista === 'ventas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
              <div style={sCrd_BJ}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>💰 CAJA EFECTIVO HOY (LIQUIDO)</span>
                    <button onClick={handleExportarExcelCierreFinal} style={{ background:`${FUCSIA_PRINCIPAL}20`, border:'none', padding:'8px 15px', borderRadius:'10px', color:FUCSIA_PRINCIPAL, fontWeight:'900', fontSize:'10px', cursor:'pointer' }}>EXCEL</button>
                </div>
                <h2 style={{ margin: '15px 0', fontSize: '3.5rem', fontWeight: '900' }}>S/ {balanceBunkerElite.cajaHoy.toFixed(2)}</h2>
                <div style={{ color: VERDE_BJ, fontWeight: '900', fontSize: '15px' }}>Ganancia Día: S/ {balanceBunkerElite.ganHoy.toFixed(2)}</div>
              </div>
              <div style={sCrd_BJ}>
                <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>📅 BUSCAR HISTORIAL BJ</span>
                <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...sInp_BJ, marginTop: '15px' }} />
              </div>
            </div>

            <div style={{ ...sCrd_BJ, border: `3px solid #FCA5D4` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom:'25px' }}>
                <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontWeight: '900' }}>🛒 Registrar Operación Chiclayo</h3>
                <div style={{ display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '18px', padding: '6px' }}>
                  <button onClick={() => setTipoVenta('Mayor')} style={{ border: 'none', padding: '10px 22px', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: '900', backgroundColor: tipoVenta === 'Mayor' ? FUCSIA_PRINCIPAL : 'transparent', color: tipoVenta === 'Mayor' ? '#fff' : '#64748B' }}>MAYOR</button>
                  <button onClick={() => setTipoVenta('Menor')} style={{ border: 'none', padding: '10px 22px', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: '900', backgroundColor: tipoVenta === 'Menor' ? OSCURO_BJ : 'transparent', color: tipoVenta === 'Menor' ? '#fff' : '#64748B' }}>MINORISTA</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '30px' }}>
                <input list="cli_aut_bj_v55" placeholder="👤 Nombre Cliente" value={cliente} onChange={handleAutocompleteClienteMaster} style={sInp_BJ} />
                <datalist id="cli_aut_bj_v55">{[...new Set(ventas.map(v => v.cliente_nombre))].map((c, i) => <option key={i} value={c} />)}</datalist>
                <input placeholder="📱 WhatsApp" value={telefono} onChange={e => setTelefono(e.target.value)} style={sInp_BJ} />
                <input placeholder="📍 Zona / Distrito" value={localidad} onChange={e => setLocalidad(e.target.value)} style={sInp_BJ} />
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
                    <button onClick={() => processOperacionBJFinal('Entregado')} style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '20px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '14px' }}>✅ PAGADO/ENTREGA</button>
                    <button onClick={() => processOperacionBJFinal('En Almacén')} style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '20px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '14px' }}>📦 PAGADO/ALMACÉN</button>
                    <button onClick={() => processOperacionBJFinal('Pendiente de Pago')} style={{ backgroundColor: AMARILLO_BJ, color: '#fff', border: 'none', padding: '20px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '14px' }}>💸 DAR A PAGAR (CRÉDITO)</button>
                  </div>
                </div>
              )}

              <input placeholder="🔍 Buscar modelo para vender..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...sInp_BJ, marginBottom: '25px', height: '65px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '25px', maxHeight: '750px', overflowY: 'auto' }}>
                {productos.filter(p => p.nombre?.toLowerCase().includes(busqueda.toLowerCase())).map((p) => {
                  const tBJ = getEtiquetaProducto(p.created_at);
                  const pShowBJ = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
                  const sLowBJ = Number(p.stock || 0) < 5;
                  return (
                    <div key={p.id} style={{ border: sLowBJ ? `2px solid ${ROJO_BJ}` : '1px solid #FFF1F2', padding: '22px', borderRadius: '35px', backgroundColor: '#fff', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
                      {tBJ && <span style={{ position:'absolute', top: '-15px', left: '20px', backgroundColor: tBJ.color, color: '#fff', fontSize: '10px', padding: '6px 15px', borderRadius: '15px', fontWeight: '900' }}>{tBJ.tipo}</span>}
                      <strong style={{ display: 'block', height: '45px', overflow: 'hidden', fontSize: '16px' }}>{p.nombre}</strong>
                      <div style={{ margin: '10px 0', padding: '10px', backgroundColor: sLowBJ ? '#FFF1F2' : '#F0FDF4', borderRadius: '18px', textAlign: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: '900', color: sLowBJ ? ROJO_BJ : VERDE_BJ }}>STOCK: {p.stock} U.</span>
                      </div>
                      <select value={coloresElegidos[p.id]} onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{ ...sInp_BJ, padding: '10px', fontSize: '14px', marginBottom: '18px', height: '50px' }}>
                        {p.colores?.split(',').map(c => <option key={c} value={c.trim()}>{c.trim()}</option>)}
                      </select>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '18px', marginBottom: '22px' }}>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.max(1, (cantidades[p.id] || 1) - 1)})} style={{ border: 'none', background: '#f5f5f5', borderRadius: '12px', width: '48px', height: '48px', cursor:'pointer' }}>-</button>
                        <span style={{ fontWeight: '900', fontSize: '22px', paddingTop:'10px' }}>{cantidades[p.id] || 1}</span>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.min(p.stock, (cantidades[p.id] || 1) + 1)})} style={{ border: 'none', background: '#f5f5f5', borderRadius: '12px', width: '48px', height: '48px', cursor:'pointer' }}>+</button>
                      </div>
                      <button onClick={() => handleAddAlCarritoElite(p)} disabled={p.stock <= 0} style={{ width: '100%', backgroundColor: tipoVenta === 'Mayor' ? OSCURO_BJ : '#A13C6D', color: '#fff', border: 'none', padding: '18px', borderRadius: '22px', fontSize: '14px', fontWeight: '900', cursor:'pointer' }}>
                        {p.stock > 0 ? `VENDER S/ ${Number(pShowBJ).toFixed(2)}` : 'AGOTADO'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={sCrd_BJ}>
                <h4 style={{margin:0, color:'#64748B', fontWeight:'900', fontSize:'13px', textTransform:'uppercase', marginBottom:'25px'}}>📜 Historial de Ventas Seleccionadas</h4>
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
                                <button onClick={() => handleWhatsAppTicketDirecto(grupo)} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '12px', fontWeight:'900', cursor:'pointer' }}>TICKET 📱</button>
                                <button onClick={() => {setEditandoGrupoId(grupo.id_grupo); setFormEditCliente({nombre: grupo.cliente_nombre, localidad: grupo.localidad, telefono: grupo.telefono});}} style={{ border:'none', background:'#fff', padding:'10px', borderRadius:'12px', cursor:'pointer', border:'2px solid #FCC2E2' }}>✏️</button>
                            </div>
                        </div>
                        <div style={{marginTop:'15px'}}>{grupo.items.map(v => (
                            <div key={v.id} style={{background:'#fff', padding:'10px 20px', borderRadius:'15px', marginBottom:'8px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <div>
                                    {idItemVentaEditando === v.id ? (
                                        <div style={{display:'flex', gap:'10px'}}>
                                            <input type="number" value={nuevaCantVenta} onChange={(e)=>setNuevaCantVenta(Number(e.target.value))} style={{width:'60px', padding:'5px', borderRadius:'8px', border:'1px solid #ccc'}} />
                                            <button onClick={()=>handleEditarCantidadMasterBJ(v)} style={{background:VERDE_BJ, color:'#fff', border:'none', borderRadius:'8px', padding:'5px 10px'}}>OK</button>
                                        </div>
                                    ) : (
                                        <small>{v.cantidad}x {productos.find(p=>p.id===v.producto_id)?.nombre || 'Item'} ({v.color}) | <span style={{color: v.estado_pedido==='Pendiente de Pago' ? AMARILLO_BJ : '#64748B'}}>{v.estado_pedido}</span></small>
                                    )}
                                </div>
                                <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                                    <strong>S/ {(v.precio_venta_unitario * v.cantidad).toFixed(2)}</strong>
                                    <button onClick={()=> {setIdItemVentaEditando(v.id); setNuevaCantVenta(v.cantidad);}} style={{border:'none', background:'none', color:'#64748B', fontSize:'10px', textDecoration:'underline', cursor:'pointer'}}>Editar</button>
                                    <button onClick={()=>handleAnularVentaCompletaBJ(v)} style={{border:'none', background:'none', color:ROJO_BJ, fontWeight:'bold', cursor:'pointer'}}>🗑️</button>
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
            <div style={{ ...sCrd_BJ, backgroundColor: OSCURO_BJ, color: '#fff', padding: '40px', textAlign: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900' }}>📦 Centro de Operaciones BJ</h2>
                <p style={{opacity:0.7, fontSize:'1.1rem'}}>Gestión de almacén físico y cobranzas de ventas a crédito.</p>
            </div>
            
            <div style={sCrd_BJ}>
                <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: FUCSIA_PRINCIPAL, marginBottom:'25px' }}>📦 Entregas Pendientes (Ya Pagado)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {logisticaInteligente.almacen.map((grupo, idx) => (
                        <div key={idx} style={{ padding: '25px', border: '1px solid #f1f1f1', borderRadius: '25px' }}>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
                                <div><strong>{grupo.cliente}</strong><br/><small>{grupo.localidad}</small></div>
                                <button onClick={() => { let m = `¡Hola *${grupo.cliente}*! 👋 BJ Importaciones Chiclayo te avisa que tu pedido está listo. ✨📦`; window.open(`https://wa.me/51${grupo.telefono?.replace(/\D/g,'')}?text=${m}`, '_blank'); }} style={{ background:'#25D366', color:'#fff', border:'none', padding:'10px 15px', borderRadius:'12px', fontWeight:'900', cursor:'pointer' }}>AVISAR 📱</button>
                            </div>
                            <div style={{marginBottom:'15px'}}>{grupo.items.map((it,i) => <div key={i}><small>{it.cantidad}x {it.color}</small></div>)}</div>
                            <button onClick={async () => { if(confirm("¿Confirmar entrega física?")) { for(let i of grupo.items) await supabase.from('ventas').update({estado_pedido:'Entregado'}).eq('id', i.id); } }} style={{ width: '100%', backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: '900', cursor:'pointer' }}>CONFIRMAR ENTREGA ✅</button>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ ...sCrd_BJ, borderLeft: `15px solid ${AMARILLO_BJ}` }}>
                <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: AMARILLO_BJ, marginBottom:'25px' }}>💸 Cuentas Deudoras (Ventas a Crédito)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {logisticaInteligente.cuentasPorCobrar.map((grupo, idx) => (
                        <div key={idx} style={{ padding: '25px', backgroundColor: '#FFFBEB', borderRadius: '25px', border:`2px solid ${AMARILLO_BJ}40` }}>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
                                <div><strong>{grupo.cliente}</strong><br/><small>{grupo.localidad}</small></div>
                                <button onClick={() => { let m = `Hola *${grupo.cliente}* 👋 BJ Importaciones te recuerda tu saldo pendiente de S/ ${grupo.total.toFixed(2)}. ✨`; window.open(`https://wa.me/51${grupo.telefono?.replace(/\D/g,'')}?text=${m}`, '_blank'); }} style={{ background:AMARILLO_BJ, color:'#fff', border:'none', padding:'10px 15px', borderRadius:'12px', fontWeight:'900', cursor:'pointer' }}>RECORDAR 📱</button>
                            </div>
                            <h4 style={{color:AMARILLO_AVISO, margin:'10px 0'}}>SALDO DEUDOR: S/ {grupo.total.toFixed(2)}</h4>
                            <button onClick={() => handleCobrarVentaBunker(grupo)} style={{ width: '100%', backgroundColor: VERDE_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: '900', cursor:'pointer' }}>💰 REGISTRAR PAGO TOTAL (COBRAR)</button>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        )}

        {/* ===================== TAB GESTIÓN (BUNKER v55) ===================== */}
        {vista === 'contabilidad' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
                {/* 1. PUNTO DE EQUILIBRIO MENSUAL */}
                <div style={sCrd_BJ}>
                    <h4 style={{margin:0, color:FUCSIA_PRINCIPAL, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>🏁 PUNTO DE EQUILIBRIO (UTILIDAD REAL VENTAS)</h4>
                    <div style={{height:'20px', width:'100%', backgroundColor:'#F1F5F9', borderRadius:'10px', overflow:'hidden', marginBottom:'15px', border:'1px solid #eee'}}>
                        <div style={{height:'100%', width:`${balanceBunkerElite.pe_progreso}%`, backgroundColor:VERDE_BJ, transition:'1s'}}></div>
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'13px'}}>
                        <span>Utilidad Mes: S/ {balanceBunkerElite.pe_gan.toFixed(2)}</span>
                        <strong>Meta Gasto: S/ {balanceBunkerElite.pe_meta.toFixed(2)}</strong>
                    </div>
                    {balanceBunkerElite.pe_progreso < 100 ? (
                        <small style={{color:ROJO_BJ, fontWeight:'bold', display:'block', marginTop:'5px'}}>Faltan S/ {(balanceBunkerElite.pe_meta - balanceBunkerElite.pe_gan).toFixed(2)} de utilidad para cubrir gastos operativos.</small>
                    ) : (
                        <small style={{color:VERDE_BJ, fontWeight:'bold', display:'block', marginTop:'5px'}}>¡Meta superada! Tu negocio es rentable este mes.</small>
                    )}
                </div>

                {/* 2. BÓVEDA DE GANANCIAS ACUMULADAS */}
                <div style={{ ...sCrd_BJ, backgroundColor: OSCURO_BJ, color: '#fff', border:`4px solid ${FUCSIA_PRINCIPAL}` }}>
                    <h4 style={{margin:0, color:FUCSIA_PRINCIPAL, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>💰 BÓVEDA: DISPONIBLE PARA RETIRO (UTILIDAD NETA)</h4>
                    <h3 style={{fontSize:'3.2rem', margin:0, color:'#fff'}}>S/ {balanceBunkerElite.disponibleBoveda.toFixed(2)}</h3>
                    <small style={{opacity:0.6}}>Ganancia neta acumulada histórica menos retiros registrados desde "Ganancias".</small>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
                <div style={{ ...sCrd_BJ, borderLeft:`10px solid #64748B` }}>
                    <small style={{fontWeight:'900', opacity:0.6}}>CAPITAL EN ALMACÉN (COSTO PRODUCTOS)</small>
                    <h4 style={{fontSize:'2rem', margin:'10px 0'}}>S/ {auditoriaInvPlatinum.cost.toLocaleString('es-PE')}</h4>
                </div>
                <div style={{ ...sCrd_BJ, borderLeft:`10px solid ${AMARILLO_BJ}` }}>
                    <small style={{fontWeight:'900', opacity:0.6}}>CAJA TOTAL ACTUAL (DINERO EN MANO)</small>
                    <h4 style={{fontSize:'2rem', margin:'10px 0'}}>S/ {balanceBunkerElite.cajaGlobal.toFixed(2)}</h4>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '45px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
                <div style={sCrd_BJ}>
                  <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900', fontSize:'1.2rem' }}>💸 Registrar Movimiento de Caja Detallado</h4>
                  <form onSubmit={handleRegistrarFinanzaMaster} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                        <select value={formFinanzas.tipo} onChange={e => setFormFinanzas({...formFinanzas, tipo: e.target.value})} style={sInp_BJ}>
                            <option value="Gasto Local">🏪 Gasto Local</option>
                            <option value="Inversión (Mercadería)">📦 Inversión (Mercadería)</option>
                            <option value="Retiro Personal">🏧 Retiro Personal</option>
                            <option value="Ingreso Adicional">💰 Inyección Capital (Inversión)</option>
                        </select>
                        <select value={formFinanzas.origen} onChange={e => setFormFinanzas({...formFinanzas, origen: e.target.value})} style={{...sInp_BJ, border:`2px solid ${AMARILLO_BJ}`}}>
                            <option value="Caja Global">De: Caja Global (Capital)</option>
                            <option value="Ganancias">De: Ganancias del Negocio</option>
                        </select>
                    </div>
                    <input placeholder="Descripción del movimiento..." value={formFinanzas.descripcion} onChange={e => setFormFinanzas({...formFinanzas, descripcion: e.target.value})} style={sInp_BJ} />
                    <input type="text" placeholder="Monto S/" value={formFinanzas.monto} onChange={e => setFormFinanzas({...formFinanzas, monto: handleInputMonto(e.target.value)})} style={sInp_BJ} />
                    <button type="submit" style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>GUARDAR REGISTRO</button>
                  </form>
                </div>
                <div style={{ ...sCrd_BJ, border: `3px solid ${FUCSIA_PRINCIPAL}` }}>
                  <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900', fontSize:'1.2rem' }}>🆕 Subir Nuevo Producto al Catálogo</h4>
                  <form onSubmit={handleAddProductoDB} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input placeholder="Nombre Modelo" value={formProd.nombre} onChange={e => setFormProd({...formProd, nombre: e.target.value})} style={sInp_BJ} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <input type="text" placeholder="Costo Compra" value={formProd.precio_compra} onChange={e => setFormProd({...formProd, precio_compra: handleInputMonto(e.target.value)})} style={sInp_BJ} />
                        <input type="number" placeholder="Stock Inicial" value={formProd.stock} onChange={e => setFormProd({...formProd, stock: e.target.value})} style={sInp_BJ} />
                    </div>
                    <button type="submit" style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>CREAR EN SISTEMA</button>
                  </form>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                <div style={sCrd_BJ}>
                  <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900', fontSize:'1.2rem' }}>🏆 PRODUCTOS MÁS RENTABLES (UTILIDAD REAL)</h4>
                  {analyticsMasterElite.ranking.map((p, i) => (
                    <div key={i} style={{display:'flex', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid #f1f1f1'}}>
                        <span>{i+1}. {p[0]}</span>
                        <strong style={{color:VERDE_BJ}}>+ S/ {p[1].toFixed(2)}</strong>
                    </div>
                  ))}
                </div>
                <div style={{...sCrd_BJ, borderLeft:`12px solid ${ROJO_BJ}`}}>
                    <h4 style={{margin:0, color:ROJO_BJ, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>💤 CAPITAL DORMIDO (+20 DÍAS SIN VENTA)</h4>
                    {analyticsMasterElite.dormidos.map((p, i) => (
                        <div key={i} style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                            <span>{p.nombre}</span>
                            <strong style={{color:ROJO_BJ}}>{p.stock} Unidades</strong>
                        </div>
                    ))}
                </div>
              </div>
            </div>

            <div style={bjCardStyle}>
                <h4 style={{ marginTop: 0, marginBottom: '30px', fontWeight: '900', fontSize: '1.4rem' }}>📖 Libro Diario de Operaciones BJ</h4>
                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                        <tbody>
                        {finanzas.map(f => (
                            <tr key={f.id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                            <td style={{ padding: '20px 10px' }}>
                                <small style={{fontWeight:'900', color:'#64748B', display:'block'}}>{getFechaPeru(f.created_at)} | {getHoraPeru(f.created_at)}</small>
                                <small style={{fontWeight:'900', color:FUCSIA_PRINCIPAL, textTransform:'uppercase'}}>{f.tipo}</small>
                                <br/><span style={{ fontWeight: '600', fontSize:'15px' }}>{f.descripcion}</span>
                                <br/><small style={{color: AMARILLO_BJ, fontWeight:'900'}}>Bolsa: {f.origen || 'Caja Global'}</small>
                            </td>
                            <td style={{ textAlign: 'right', padding: '20px 10px', fontWeight: '900', fontSize: '18px', color: (f.tipo.includes('Ingreso')) ? VERDE_BJ : OSCURO_BJ }}>S/ {(Number(f.monto) || 0).toFixed(2)}</td>
                            <td style={{ textAlign: 'right', padding: '20px 10px' }}>
                                <button onClick={async ()=> { if(confirm("¿Borrar definitivamente?")) await supabase.from('finanzas').delete().eq('id', f.id); }} style={{background:'none', border:'none', color: FUCSIA_PRINCIPAL, cursor:'pointer', fontSize: '1.5rem'}}>🗑️</button>
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={bjCardStyle}>
                <h4 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, marginBottom: '35px', fontWeight: '900', fontSize: '1.4rem' }}>📈 ROI / Retorno de Inversión Almacén</h4>
                <div style={{ height: '400px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartROIStructure} margin={{ top: 25, right: 30, left: -5, bottom: 20 }}>
                            <CartesianGrid