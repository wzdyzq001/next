import React, { useState, useEffect } from 'react';
import { useAiAssistantContext } from './AiAssistant';
import { STORAGE_KEY_CHAT_HISTORY, COLLAPSE_STATE_STORAGE_KEY, LAST_ENTRY_STORAGE_KEY } from './AiAssistant/constants';
import type { ChatMessage, ConversationContext, LastEntryState, CollapseState } from './AiAssistant/types';

const genId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const createEmptyContext = (): ConversationContext => ({
  sessionId: 'test-session-' + Date.now(),
  currentOrderId: undefined,
  orderContext: undefined,
  resolvedQuestions: [],
  conversationTurns: 0,
  createdAt: Date.now(),
  lastActiveAt: Date.now(),
});

const makeMessage = (role: 'user' | 'assistant', content: string, offset = 0): ChatMessage => ({
  id: genId(),
  role,
  contentType: 'text',
  content,
  timestamp: Date.now() - offset * 60000,
});

const ORDER_A = 'MT2026061800101';
const ORDER_B = 'MT2026061800102';

const TestPanel: React.FC = () => {
  const {
    openAssistant,
    closeAssistant,
    isHistoryCollapsed,
    collapsedCount,
    visibleCount,
    messages,
    entrySource,
    currentOrderId,
    toggleHistoryCollapsed,
  } = useAiAssistantContext();
  const [showPanel, setShowPanel] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 100));
  };

  const clearAllStorage = () => {
    localStorage.removeItem(STORAGE_KEY_CHAT_HISTORY);
    localStorage.removeItem(COLLAPSE_STATE_STORAGE_KEY);
    localStorage.removeItem(LAST_ENTRY_STORAGE_KEY);
    addLog('🧹 已清空所有 localStorage 数据');
  };

  const prependHistoryMessages = (count: number, orderId?: string) => {
    const raw = localStorage.getItem(STORAGE_KEY_CHAT_HISTORY);
    const allHistory = raw ? JSON.parse(raw) : {};
    const existing = allHistory['default'] || { messages: [], context: createEmptyContext() };

    const historyMsgs: ChatMessage[] = [];
    for (let i = count; i >= 1; i--) {
      historyMsgs.push(makeMessage('user', `历史用户消息 ${i}`, i * 2 + 10));
      historyMsgs.push(makeMessage('assistant', `历史助手回复 ${i}`, i * 2 + 9));
    }

    const newMessages = [...historyMsgs, ...existing.messages];
    allHistory['default'] = {
      messages: newMessages,
      context: { ...existing.context, lastActiveAt: Date.now() },
      savedAt: Date.now(),
    };

    if (orderId) {
      allHistory['default'].context.currentOrderId = orderId;
    }

    localStorage.setItem(STORAGE_KEY_CHAT_HISTORY, JSON.stringify(allHistory));
    addLog(`📝 已预填充 ${count * 2} 条历史消息（当前共 ${newMessages.length} 条）`);
  };

  const setLastEntry = (source: 'order_list' | 'order_detail', orderId?: string) => {
    const state: LastEntryState = { source, orderId };
    localStorage.setItem(LAST_ENTRY_STORAGE_KEY, JSON.stringify(state));
    addLog(`📍 设置前置入口: source=${source}, orderId=${orderId || '无'}`);
  };

  const setCollapseState = (key: string, collapsed: boolean, visibleCount: number) => {
    const raw = localStorage.getItem(COLLAPSE_STATE_STORAGE_KEY);
    const state = raw ? JSON.parse(raw) : {};
    state[key] = { collapsed, visibleCount };
    localStorage.setItem(COLLAPSE_STATE_STORAGE_KEY, JSON.stringify(state));
    addLog(`📦 设置折叠状态: key=${key}, collapsed=${collapsed}, visibleCount=${visibleCount}`);
  };

  const verifyScenario = (name: string, expected: {
    isCollapsed: boolean;
    visibleMessageCount: number;
    hasOrderCard?: boolean;
    orderId?: string;
  }, actual: {
    isCollapsed: boolean;
    visibleMessageCount: number;
    lastMessageHasOrderCard: boolean;
    lastOrderId?: string;
  }) => {
    const passed =
      actual.isCollapsed === expected.isCollapsed &&
      actual.visibleMessageCount === expected.visibleMessageCount;
    const status = passed ? '✅' : '❌';
    addLog(`${status} ${name}`);
    addLog(`   预期: collapsed=${expected.isCollapsed}, 可见${expected.visibleMessageCount}条`);
    addLog(`   实际: collapsed=${actual.isCollapsed}, 可见${actual.visibleMessageCount}条`);
    return passed;
  };

  const getActualState = () => {
    const visibleMsgCount = isHistoryCollapsed ? messages.length - collapsedCount : messages.length;
    const lastMsg = messages[messages.length - 1];
    const lastHasOrderCard = !!lastMsg?.orderCard;
    const lastOrderId = lastMsg?.orderCard?.id;
    return {
      isCollapsed: isHistoryCollapsed,
      visibleMessageCount: visibleMsgCount,
      lastMessageHasOrderCard: lastHasOrderCard,
      lastOrderId,
    };
  };

  const runScenario1 = () => {
    addLog('========== 🧪 场景1：订单中心重复进入（前置=订单中心） ==========');
    addLog('规则：默认展开最近2条，其余折叠');
    clearAllStorage();

    setTimeout(() => {
      prependHistoryMessages(3);
      setLastEntry('order_list');

      setTimeout(() => {
        addLog('操作：从订单中心入口进入');
        openAssistant(undefined, 'order_list');

        setTimeout(() => {
          const actual = getActualState();
          verifyScenario('订单中心重复进入', {
            isCollapsed: true,
            visibleMessageCount: 2,
          }, actual);
          addLog(`   entrySource=${entrySource}, visibleCount=${visibleCount}, collapsedCount=${collapsedCount}`);
        }, 300);
      }, 200);
    }, 200);
  };

  const runScenario2 = () => {
    addLog('========== 🧪 场景2：订单详情→订单中心（前置=详情页） ==========');
    addLog('规则：默认展开最近1条，其余折叠');
    clearAllStorage();

    setTimeout(() => {
      prependHistoryMessages(3);
      setLastEntry('order_detail', ORDER_A);

      setTimeout(() => {
        addLog('操作：从订单中心入口进入');
        openAssistant(undefined, 'order_list');

        setTimeout(() => {
          const actual = getActualState();
          verifyScenario('详情页→订单中心', {
            isCollapsed: true,
            visibleMessageCount: 1,
          }, actual);
          addLog(`   entrySource=${entrySource}, visibleCount=${visibleCount}, collapsedCount=${collapsedCount}`);
        }, 300);
      }, 200);
    }, 200);
  };

  const runScenario3 = () => {
    addLog('========== 🧪 场景3：订单中心→订单详情新订单 ==========');
    addLog('规则：只展示默认带入的当前订单卡片，历史消息折叠');
    clearAllStorage();

    setTimeout(() => {
      prependHistoryMessages(3);
      setLastEntry('order_list');

      setTimeout(() => {
        addLog(`操作：从订单详情页进入新订单（${ORDER_A}）`);
        openAssistant(ORDER_A, 'order_detail');

        setTimeout(() => {
          const actual = getActualState();
          const passed =
            actual.isCollapsed === true &&
            actual.lastMessageHasOrderCard === true &&
            actual.visibleMessageCount >= 1;
          const status = passed ? '✅' : '❌';
          addLog(`${status} 订单中心→新订单详情`);
          addLog(`   预期: collapsed=true, 可见1条(订单卡片), 末尾有订单卡片`);
          addLog(`   实际: collapsed=${actual.isCollapsed}, 可见${actual.visibleMessageCount}条, 末尾有卡=${actual.lastMessageHasOrderCard}`);
          addLog(`   entrySource=${entrySource}, currentOrderId=${currentOrderId}, collapsedCount=${collapsedCount}`);
        }, 300);
      }, 200);
    }, 200);
  };

  const runScenario4 = () => {
    addLog('========== 🧪 场景4：同订单详情重复进入（保持上次展开状态） ==========');
    addLog('规则：保持上次访问时外露展开的卡片数量不变，不重新带入订单卡片');
    clearAllStorage();

    setTimeout(() => {
      addLog('步骤1：先进入订单A，建立会话 + 展开全部');
      openAssistant(ORDER_A, 'order_detail');

      setTimeout(() => {
        const initialMsgCount = messages.length;
        addLog(`   初始消息数: ${initialMsgCount}`);

        setTimeout(() => {
          addLog('步骤2：手动展开全部（模拟用户点击展开）');
          toggleHistoryCollapsed();

          setTimeout(() => {
            addLog(`   展开后: isHistoryCollapsed=${isHistoryCollapsed}`);
            addLog('步骤3：关闭助手');
            closeAssistant();

            setTimeout(() => {
              addLog('步骤4：再次进入同一订单详情页');
              openAssistant(ORDER_A, 'order_detail');

              setTimeout(() => {
                const actual = getActualState();
                const passed = actual.isCollapsed === false;
                const status = passed ? '✅' : '❌';
                addLog(`${status} 同订单重复进入（保持展开状态）`);
                addLog(`   预期: collapsed=false（保持上次展开）`);
                addLog(`   实际: collapsed=${actual.isCollapsed}, 可见${actual.visibleMessageCount}条`);
                addLog(`   currentOrderId=${currentOrderId}`);

                const orderCardCount = messages.filter(m => m.orderCard).length;
                addLog(`   订单卡片数量: ${orderCardCount}（应为1，不能重复添加）`);
              }, 300);
            }, 300);
          }, 200);
        }, 300);
      }, 300);
    }, 200);
  };

  const runScenario5 = () => {
    addLog('========== 🧪 场景5：订单A详情→订单B详情（不同订单切换） ==========');
    addLog('规则：只展示默认带入的当前订单B卡片，之前订单的聊天记录折叠');
    clearAllStorage();

    setTimeout(() => {
      addLog('步骤1：先进入订单A');
      openAssistant(ORDER_A, 'order_detail');

      setTimeout(() => {
        addLog(`   订单A消息数: ${messages.length}`);
        addLog('步骤2：关闭助手');
        closeAssistant();

        setTimeout(() => {
          addLog(`步骤3：进入订单B（新订单）`);
          openAssistant(ORDER_B, 'order_detail');

          setTimeout(() => {
            const actual = getActualState();
            const orderBIndex = messages.findIndex(m => m.orderCard?.id === ORDER_B);
            const msgsAfterOrderB = messages.length - orderBIndex - 1;
            const passed =
              actual.isCollapsed === true &&
              orderBIndex >= 0 &&
              actual.lastOrderId === ORDER_B;
            const status = passed ? '✅' : '❌';
            addLog(`${status} 订单A→订单B（不同订单切换）`);
            addLog(`   预期: 只展示订单B卡片，之前消息折叠`);
            addLog(`   实际: collapsed=${actual.isCollapsed}, 可见${actual.visibleMessageCount}条`);
            addLog(`   末尾订单ID: ${actual.lastOrderId}（应为${ORDER_B}）`);
            addLog(`   collapsedCount=${collapsedCount}, 订单B卡片在第${orderBIndex}条`);
          }, 300);
        }, 300);
      }, 300);
    }, 200);
  };

  const runScenario6 = () => {
    addLog('========== 🧪 场景6：订单A→订单B→订单A（切回旧订单） ==========');
    addLog('规则：订单A视为新订单，只展示订单A卡片，历史折叠');
    clearAllStorage();

    setTimeout(() => {
      addLog('步骤1：进入订单A');
      openAssistant(ORDER_A, 'order_detail');
      setTimeout(() => {
        closeAssistant();

        setTimeout(() => {
          addLog('步骤2：进入订单B');
          openAssistant(ORDER_B, 'order_detail');
          setTimeout(() => {
            closeAssistant();

            setTimeout(() => {
              addLog('步骤3：切回订单A（应视为新订单）');
              openAssistant(ORDER_A, 'order_detail');

              setTimeout(() => {
                const actual = getActualState();
                const orderACards = messages.filter(m => m.orderCard?.id === ORDER_A);
                const passed =
                  actual.isCollapsed === true &&
                  actual.lastOrderId === ORDER_A;
                const status = passed ? '✅' : '❌';
                addLog(`${status} 订单A→B→A（切回旧订单）`);
                addLog(`   预期: 订单A视为新订单，只展示订单A卡片`);
                addLog(`   实际: collapsed=${actual.isCollapsed}, 末尾订单ID=${actual.lastOrderId}`);
                addLog(`   消息中订单A卡片数量: ${orderACards.length}（可能多张因为每次都加，需看历史）`);
              }, 300);
            }, 300);
          }, 300);
        }, 300);
      }, 300);
    }, 200);
  };

  const runAllScenarios = () => {
    addLog('🚀 开始运行全部场景...');
    let delay = 0;
    const scenarios = [
      runScenario1,
      () => { closeAssistant(); setTimeout(runScenario2, 500); },
      () => { closeAssistant(); setTimeout(runScenario3, 500); },
      () => { closeAssistant(); setTimeout(runScenario4, 500); },
      () => { closeAssistant(); setTimeout(runScenario5, 500); },
      () => { closeAssistant(); setTimeout(runScenario6, 500); },
    ];
    scenarios.forEach((fn, i) => {
      setTimeout(fn, delay);
      delay += 3000;
    });
  };

  const printCurrentState = () => {
    const visibleCountActual = isHistoryCollapsed ? messages.length - collapsedCount : messages.length;
    const lastEntry = (() => {
      try {
        const raw = localStorage.getItem(LAST_ENTRY_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch { return null; }
    })();
    const collapseState = (() => {
      try {
        const raw = localStorage.getItem(COLLAPSE_STATE_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch { return null; }
    })();

    addLog('📊 当前状态：');
    addLog(`  - entrySource: ${entrySource}`);
    addLog(`  - currentOrderId: ${currentOrderId || '无'}`);
    addLog(`  - messages 总数: ${messages.length}`);
    addLog(`  - isHistoryCollapsed: ${isHistoryCollapsed}`);
    addLog(`  - collapsedCount: ${collapsedCount}`);
    addLog(`  - visibleCount(state): ${visibleCount}`);
    addLog(`  - 实际可见消息数: ${visibleCountActual}`);
    addLog(`  - lastEntry(localStorage): ${lastEntry ? JSON.stringify(lastEntry) : '无'}`);
    addLog(`  - collapseState(localStorage): ${collapseState ? JSON.stringify(collapseState) : '无'}`);
  };

  useEffect(() => {
    if (messages.length > 0) {
      // 状态变化时不自动打印，避免日志过多
    }
  }, [isHistoryCollapsed, collapsedCount, messages.length, entrySource, currentOrderId, visibleCount]);

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        style={{
          position: 'fixed',
          bottom: '100px',
          right: '16px',
          zIndex: 9999,
          padding: '8px 12px',
          background: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        🧪 测试面板
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '100px',
        right: '16px',
        width: '380px',
        maxHeight: '70vh',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '14px',
          fontWeight: 600,
          color: '#1e293b',
        }}
      >
        <span>🧪 入口逻辑验证面板 (V2.2)</span>
        <button
          onClick={() => setShowPanel(false)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            color: '#64748b',
          }}
        >
          ✕
        </button>
      </div>

      <div
        style={{
          padding: '12px',
          borderBottom: '1px solid #e2e8f0',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
        }}
      >
        <button onClick={runScenario1} style={btnStyle('#2563eb')}>
          场景1: 订单中心重复进入
        </button>
        <button onClick={runScenario2} style={btnStyle('#7c3aed')}>
          场景2: 详情→订单中心
        </button>
        <button onClick={runScenario3} style={btnStyle('#059669')}>
          场景3: 订单中心→新详情
        </button>
        <button onClick={runScenario4} style={btnStyle('#d97706')}>
          场景4: 同订单重复进入
        </button>
        <button onClick={runScenario5} style={btnStyle('#dc2626')}>
          场景5: 订单A→订单B
        </button>
        <button onClick={runScenario6} style={btnStyle('#db2777')}>
          场景6: A→B→A切回
        </button>
        <button onClick={runAllScenarios} style={{ ...btnStyle('#1e293b'), gridColumn: 'span 2' }}>
          🚀 一键运行全部场景
        </button>
      </div>

      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <button onClick={clearAllStorage} style={btnStyle('#94a3b8', true)}>
          🧹 清空数据
        </button>
        <button onClick={() => prependHistoryMessages(3)} style={btnStyle('#94a3b8', true)}>
          📝 +6条历史
        </button>
        <button onClick={printCurrentState} style={btnStyle('#475569', true)}>
          📊 打印状态
        </button>
        <button onClick={closeAssistant} style={btnStyle('#ef4444', true)}>
          ❌ 关闭助手
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 12px',
          fontSize: '12px',
          lineHeight: 1.6,
          color: '#334155',
          background: '#fafbfc',
        }}
      >
        {logs.length === 0 ? (
          <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
            点击上方按钮开始测试
          </div>
        ) : (
          logs.map((log, i) => (
            <div
              key={i}
              style={{
                padding: '2px 0',
                borderBottom: i < logs.length - 1 ? '1px solid #f1f5f9' : 'none',
                color: log.startsWith('==========') ? '#2563eb'
                  : log.startsWith('✅') ? '#059669'
                  : log.startsWith('❌') ? '#dc2626'
                  : log.startsWith('预期') || log.startsWith('实际') ? '#64748b'
                  : undefined,
                fontWeight: log.startsWith('==========') || log.startsWith('✅') || log.startsWith('❌') ? 600 : undefined,
              }}
            >
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const btnStyle = (color: string, small = false): React.CSSProperties => ({
  padding: small ? '6px 10px' : '8px 10px',
  background: color,
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: small ? '11px' : '12px',
  fontWeight: 500,
  transition: 'opacity 0.15s',
});

export default TestPanel;
