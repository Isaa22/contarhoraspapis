document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const monthSelect = document.getElementById('month-select');
    const yearSelect = document.getElementById('year-select');
    const changeMonthBtn = document.getElementById('change-month');
    const calculateBtn = document.getElementById('calculate-btn');
    const saveBtn = document.getElementById('save-btn');
    const pdfBtn = document.getElementById('pdf-btn');
    const resetBtn = document.getElementById('reset-btn');
    const timesheetBody = document.querySelector('#timesheet tbody');
    const totalHoursEl = document.getElementById('total-hours');
    const breakHoursEl = document.getElementById('break-hours');
    const interjornadaHoursEl = document.getElementById('interjornada-hours');
    const workedDaysEl = document.getElementById('worked-days');

    // Variáveis globais
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();
    let timesheetData = {};

    // Inicialização
    initializeYearSelect();
    loadTimesheetData();
    generateTimesheet();
    updateDashboard();

    // Event Listeners
    changeMonthBtn.addEventListener('click', changeMonth);
    calculateBtn.addEventListener('click', calculateAllHours);
    saveBtn.addEventListener('click', saveTimesheetData);
    pdfBtn.addEventListener('click', generatePDF);
    resetBtn.addEventListener('click', resetTimesheet);

    // Funções
    function initializeYearSelect() {
        const currentYear = new Date().getFullYear();
        for (let i = currentYear - 5; i <= currentYear + 5; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            if (i === currentYear) option.selected = true;
            yearSelect.appendChild(option);
        }
        
        // Definir o mês atual
        monthSelect.value = currentMonth;
    }

    function changeMonth() {
        currentMonth = parseInt(monthSelect.value);
        currentYear = parseInt(yearSelect.value);
        generateTimesheet();
        updateDashboard();
    }

    function generateTimesheet() {
        timesheetBody.innerHTML = '';
        
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const monthNames = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonth, day);
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            
            const row = document.createElement('tr');
            if (isWeekend) row.classList.add('weekend');
            
            // Dia da semana
            const dayCell = document.createElement('td');
            dayCell.className = 'day-name';
            dayCell.textContent = `${day}/${currentMonth + 1} - ${getDayName(dayOfWeek)}`;
            row.appendChild(dayCell);
            
            // Campos de horário
            const timeFields = [
                'saida_casa', 'chegada_mato', 'saida_cafe', 'volta_cafe', 
                'interjornada1', 'volta_interjornada1', 'saida_almoco', 
                'volta_almoco', 'interjornada2', 'volta_interjornada2', 
                'saida_mato', 'chegada_casa'
            ];
            
            timeFields.forEach(field => {
                const cell = document.createElement('td');
                const input = document.createElement('input');
                input.type = 'time';
                input.dataset.day = day;
                input.dataset.field = field;
                
                const dateKey = `${currentYear}-${currentMonth}-${day}`;
                const dayData = timesheetData[dateKey];
                if (dayData && dayData[field]) {
                    input.value = dayData[field];
                }
                
                input.addEventListener('change', updateTimesheetData);
                cell.appendChild(input);
                row.appendChild(cell);
            });
            
            // Célula de horas trabalhadas
            const hoursCell = document.createElement('td');
            hoursCell.id = `hours-${day}`;
            hoursCell.className = 'worked-hours';
            hoursCell.textContent = '00:00';
            row.appendChild(hoursCell);
            
            timesheetBody.appendChild(row);
        }
        
        // Calcular horas para dias já preenchidos
        for (let day = 1; day <= daysInMonth; day++) {
            calculateDayHours(day);
        }
    }

    function getDayName(dayIndex) {
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        return days[dayIndex];
    }

    function updateTimesheetData(e) {
        const day = e.target.dataset.day;
        const field = e.target.dataset.field;
        const value = e.target.value;
        
        const dateKey = `${currentYear}-${currentMonth}-${day}`;
        
        if (!timesheetData[dateKey]) {
            timesheetData[dateKey] = {};
        }
        
        timesheetData[dateKey][field] = value;
        
        // Calcular horas do dia
        calculateDayHours(day);
        updateDashboard();
    }

    function calculateDayHours(day) {
        const dateKey = `${currentYear}-${currentMonth}-${day}`;
        const dayData = timesheetData[dateKey];
        
        if (!dayData) return;
        
        let totalWorkMinutes = 0;
        
        // Horário de chegada no mato até saída do café
        if (dayData.chegada_mato && dayData.saida_cafe) {
            totalWorkMinutes += timeDifference(dayData.chegada_mato, dayData.saida_cafe);
        }
        
        // Volta do café até interjornada
        if (dayData.volta_cafe && dayData.interjornada1) {
            totalWorkMinutes += timeDifference(dayData.volta_cafe, dayData.interjornada1);
        }
        
        // Volta da interjornada até saída do almoço
        if (dayData.volta_interjornada1 && dayData.saida_almoco) {
            totalWorkMinutes += timeDifference(dayData.volta_interjornada1, dayData.saida_almoco);
        }
        
        // Volta do almoço até interjornada
        if (dayData.volta_almoco && dayData.interjornada2) {
            totalWorkMinutes += timeDifference(dayData.volta_almoco, dayData.interjornada2);
        }
        
        // Volta da interjornada até saída do mato
        if (dayData.volta_interjornada2 && dayData.saida_mato) {
            totalWorkMinutes += timeDifference(dayData.volta_interjornada2, dayData.saida_mato);
        }
        
        const hours = Math.floor(totalWorkMinutes / 60);
        const minutes = totalWorkMinutes % 60;
        
        const hoursCell = document.getElementById(`hours-${day}`);
        hoursCell.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        
        // Atualizar dados no objeto
        dayData.totalHours = totalWorkMinutes;
        dayData.formattedHours = hoursCell.textContent;
    }

    function timeDifference(start, end) {
        if (!start || !end) return 0;
        
        const startTime = new Date(`1970-01-01T${start}:00`);
        const endTime = new Date(`1970-01-01T${end}:00`);
        
        // Se o horário de término for anterior ao de início, assumir que é no dia seguinte
        if (endTime < startTime) {
            endTime.setDate(endTime.getDate() + 1);
        }
        
        return (endTime - startTime) / (1000 * 60); // Diferença em minutos
    }

    function calculateAllHours() {
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        for (let day = 1; day <= daysInMonth; day++) {
            calculateDayHours(day);
        }
        
        updateDashboard();
        alert('Cálculo de horas concluído!');
    }

    function updateDashboard() {
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        let totalWorkMinutes = 0;
        let totalBreakMinutes = 0;
        let totalInterjornadaMinutes = 0;
        let workedDays = 0;
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = `${currentYear}-${currentMonth}-${day}`;
            const dayData = timesheetData[dateKey];
            
            if (dayData && dayData.totalHours) {
                totalWorkMinutes += dayData.totalHours;
                workedDays++;
                
                // Calcular horas de descanso (café + almoço)
                if (dayData.saida_cafe && dayData.volta_cafe) {
                    totalBreakMinutes += timeDifference(dayData.saida_cafe, dayData.volta_cafe);
                }
                
                if (dayData.saida_almoco && dayData.volta_almoco) {
                    totalBreakMinutes += timeDifference(dayData.saida_almoco, dayData.volta_almoco);
                }
                
                // Calcular interjornada (tempo entre saída do mato e chegada em casa)
                if (dayData.saida_mato && dayData.chegada_casa) {
                    totalInterjornadaMinutes += timeDifference(dayData.saida_mato, dayData.chegada_casa);
                }
            }
        }
        
        // Atualizar dashboard
        totalHoursEl.textContent = formatTime(totalWorkMinutes);
        breakHoursEl.textContent = formatTime(totalBreakMinutes);
        interjornadaHoursEl.textContent = formatTime(totalInterjornadaMinutes);
        workedDaysEl.textContent = workedDays;
    }

    function formatTime(totalMinutes) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    function saveTimesheetData() {
        localStorage.setItem('timesheetData', JSON.stringify(timesheetData));
        alert('Dados salvos com sucesso!');
    }

    function loadTimesheetData() {
        const savedData = localStorage.getItem('timesheetData');
        if (savedData) {
            timesheetData = JSON.parse(savedData);
        }
    }

    function generatePDF() {
        // Verificar se a biblioteca jsPDF está disponível
        if (typeof jsPDF === 'undefined') {
            alert('Erro: Biblioteca jsPDF não carregada. Verifique sua conexão com a internet.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');
        
        const monthNames = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        
        const monthName = monthNames[currentMonth];
        const title = `Planilha de Horas - ${monthName}/${currentYear}`;
        
        // Título
        doc.setFontSize(16);
        doc.setTextColor(40);
        doc.text(title, 15, 15);
        
        // Dados para a tabela
        const tableData = [];
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = `${currentYear}-${currentMonth}-${day}`;
            const dayData = timesheetData[dateKey] || {};
            const date = new Date(currentYear, currentMonth, day);
            const dayOfWeek = getDayName(date.getDay());
            
            const row = [
                `${day}/${currentMonth + 1} (${dayOfWeek})`,
                dayData.saida_casa || '-',
                dayData.chegada_mato || '-',
                dayData.saida_cafe || '-',
                dayData.volta_cafe || '-',
                dayData.interjornada1 || '-',
                dayData.volta_interjornada1 || '-',
                dayData.saida_almoco || '-',
                dayData.volta_almoco || '-',
                dayData.interjornada2 || '-',
                dayData.volta_interjornada2 || '-',
                dayData.saida_mato || '-',
                dayData.chegada_casa || '-',
                dayData.formattedHours || '00:00'
            ];
            
            tableData.push(row);
        }
        
        // Cabeçalhos da tabela
        const headers = [
            'Dia',
            'Saída Casa',
            'Chegada Mato',
            'Saída Café',
            'Volta Café',
            'Interjornada',
            'Volta Interjornada',
            'Saída Almoço',
            'Volta Almoço',
            'Interjornada',
            'Volta Interjornada',
            'Saída Mato',
            'Chegada Casa',
            'Horas Trab.'
        ];

         // Data de geração do PDF
        const today = new Date();
        const genDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()} ${today.getHours()}:${today.getMinutes()}`;
        doc.text(`Gerado em: ${genDate}`, 15, finalY + 25);
        
        // Salvar o PDF
        doc.save(`planilha_horas_${monthName}_${currentYear}.pdf`);
    }
        // Configurações da tabela
        const tableConfig = {
            head: [headers],
            body: tableData,
            startY: 25,
            headStyles: {
                fillColor: [52, 152, 219],
                textColor: 255,
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: [240, 240, 240]
            },
            styles: {
                fontSize: 7,
                cellPadding: 2,
                overflow: 'linebreak'
            },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 20 },
                2: { cellWidth: 20 },
                3: { cellWidth: 20 },
                4: { cellWidth: 20 },
                5: { cellWidth: 20 },
                6: { cellWidth: 20 },
                7: { cellWidth: 20 },
                8: { cellWidth: 20 },
                9: { cellWidth: 20 },
                10: { cellWidth: 20 },
                11: { cellWidth: 20 },
                12: { cellWidth: 20 },
                13: { cellWidth: 15 }
            },
            margin: { top: 25 }
        };
        
        // Adicionar a tabela ao PDF
        doc.autoTable(tableConfig);
        
        // Adicionar totais no final
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.text(`Total de Horas Trabalhadas: ${totalHoursEl.textContent}`, 15, finalY);
        doc.text(`Horas de Descanso: ${breakHoursEl.textContent}`, 15, finalY + 5);
        doc.text(`Interjornada: ${interjornadaHoursEl.textContent}`, 15, finalY + 10);
        doc.text(`Dias Trabalhados: ${workedDaysEl.textContent}`, 15, finalY + 15);
        
        // Salvar o PDF
        doc.save(`planilha_horas_${monthName}_${currentYear}.pdf`);
    }

    function resetTimesheet() {
        if (confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
            timesheetData = {};
            localStorage.removeItem('timesheetData');
            generateTimesheet();
            updateDashboard();
            alert('Todos os dados foram limpos.');
        }
    }
});
