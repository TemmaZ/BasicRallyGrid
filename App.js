Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    launch: function() {

        this.myLayout = Ext.create('Ext.container.Container',{
            layout: {
                type: 'hbox',
                align: 'stretch'
            }
        });
        this.add(this.myLayout);
        this._loadSeverity();
    },

    _loadSeverity: function(){
        this.severityComboBox = Ext.create('Rally.ui.combobox.FieldValueComboBox',{
            model: 'Defect',
            field: 'Severity',
            fieldLabel: 'Severity',
            labelAlign: 'right',
            width: 200,
            listeners: {
                ready: function (combobox) {
                    this._loadPriority();
                },
                select: function(combobox, records){
                    this._loadData();
                },
                scope: this
            }
        });

        this.myLayout.add(this.severityComboBox);
    },
    _loadPriority: function(){
        this.priorityComboBox = Ext.create('Rally.ui.combobox.FieldValueComboBox',{
            model: 'Defect',
            field: 'Priority',
            fieldLabel: 'Priority',
            labelAlign: 'right',
            width: 200,
            listeners: {
                ready: function (combobox) {
                    this._loadDateForChart();
                },
                select: function(combobox, records){
                    this._loadData();
                },
                scope: this
            }
        });

        this.myLayout.add(this.priorityComboBox);
    },

    _loadDateForChart: function(){
        var endChartDate = new Date(Date.now());
        var startMonth = Ext.Date.add(endChartDate, Ext.Date.DAY, -1 * endChartDate.getDate() + 1);
        startMonth = Ext.Date.add(startMonth, Ext.Date.YEAR, -1);
        var myDate = [];
        for(var i = 0; i < 12; ++i){
            var string = Ext.Date.format(startMonth, "F - Y");
            myDate[i] = [];
            myDate[i][0] = startMonth;
            myDate[i][1] = string;
            startMonth = Ext.Date.add(startMonth, Ext.Date.MONTH, 1);
        }
        var startChartDate = Ext.Date.add(endChartDate, Ext.Date.MONTH, -1);
        myDate[12] = [];
        myDate[12][0] = startChartDate;
        myDate[12][1] = Ext.Date.format(startChartDate, "M d") + " - " + Ext.Date.format(endChartDate, "M d");
        this.dateComboBox = Ext.create('Rally.ui.combobox.ComboBox',{
            renderTo: document.body,
            queryMode: 'local',
            fieldLabel: 'Date for Chart',
            labelAlign: 'right',
            store: new Ext.data.ArrayStore({
                id: 0,
                fields: [
                    'myId',  // numeric value is the key
                    'displayText'
                ],
                data: myDate // data is local
            }),
            valueField: 'myId',
            displayField: 'displayText',
            triggerAction: 'all',
            listeners: {
                select: function(combobox, records){
                    this._loadData();
                },
                scope: this
            }
        });

        this.myLayout.add(this.dateComboBox);
        this.dateComboBox.select(startChartDate);
        this._loadData();
    },

    _loadData: function(){
        var selectedSeverity = this.severityComboBox.getRecord().get('value');
        var selectedPriority = this.priorityComboBox.getRecord().get('value');
        this.startChartDate = this.dateComboBox.getRecord().get('myId');
        var myFilter = [
            {
                property: 'Severity',
                operation: '=',
                value: selectedSeverity
            },
            {
                property: 'Priority',
                operation: '=',
                value: selectedPriority
            }
        ];
        if(this.myStore){
            this.myStore.setFilter(myFilter);
            this.myStore.load();
        }else {
            this.myStore = Ext.create('Rally.data.wsapi.Store', {
                model: 'Defect',
                autoLoad: true,
                filters: myFilter,
                listeners: {
                    load: function (myStore, myData, success) {
                        this._createChart(myStore, this.startChartDate);
                    },
                    scope: this
                },
                fetch: ['FormattedID', 'Name', 'Requirement', 'Severity', 'OpenedDate', 'ClosedDate', 'CreationDate']
            });
        }

    },

    _creatGrid: function(myStore){
        this.myGrid = Ext.create('Rally.ui.grid.Grid', {
            store: myStore,
            columnCfgs: [
                'FormattedID', 'Name', 'Requirement', 'Severity', 'OpenedDate', 'ClosedDate', 'CreationDate'
            ]
        });
        this.add(this.myGrid);
    },

    _createChart: function(myStore, startChartDate){
        var endChartDate = Ext.Date.add(startChartDate, Ext.Date.MONTH, 1);
        //if(endChartDate.getDate() == 1) endChartDate = Ext.Date.add(endChartDate, Ext.Date.DAY, -1);
        var dates = [];
        var opened = [0];
        var closed = [0];
        var active = [0];
        var buffer = startChartDate;
        while(Ext.Date.format(buffer, 'Y-m-d') != Ext.Date.format(endChartDate, 'Y-m-d')){
            dates.push(Ext.Date.format(buffer, 'm-d'));
            opened.push(0);
            closed.push(0);
            active.push(0);
            buffer = Ext.Date.add(buffer, Ext.Date.DAY, 1);
        }
        dates.push(Ext.Date.format(buffer, 'm-d'));
        var numberOfStartDate = Ext.Date.getDayOfYear(startChartDate);
        var numberOfEndDate = Ext.Date.getDayOfYear(endChartDate);
        console.log(myStore);
        for(var i = 0; i < myStore.getCount(); ++i){
            var el = myStore.getAt(i).data;
            var start = -1;
            var end = -1;

            console.log(i, el);

            if(el.CreationDate) {
                var open = new Date(el.CreationDate);
                if (open > endChartDate && Ext.Date.format(open, 'Y-m-d') != Ext.Date.format(endChartDate, 'Y-m-d')) continue;

                if(open < startChartDate || Ext.Date.format(open, 'Y-m-d') == Ext.Date.format(startChartDate, 'Y-m-d')){
                    start = 0;
                }else{
                    start = Ext.Date.getDayOfYear(open) - numberOfStartDate;
                    opened[start]++;
                }

            }
            if(el.ClosedDate){
                var close = new Date(el.ClosedDate);
                if(close < startChartDate && Ext.Date.format(close, 'Y-m-d') != Ext.Date.format(startChartDate, 'Y-m-d')) continue;

                if(close > endChartDate || Ext.Date.format(close, 'Y-m-d') == Ext.Date.format(endChartDate, 'Y-m-d')){
                    end = numberOfEndDate - numberOfStartDate + 1;
                }else{
                    end = Ext.Date.getDayOfYear(close) - numberOfStartDate;
                    closed[end]++;
                }
            }else if(el.CreationDate){
                end = numberOfEndDate - numberOfStartDate + 1;
            }


            if(start != -1 && end != -1)for(var k = start; k < end; ++k) active[k]++;
        }


        if (this.chart) {
            this.remove(this.chart);
        }
        //this.remove(this.chart);
        //console.log(this.chart);
        this.chart = Ext.create('Rally.ui.chart.Chart', {
            xtype: 'rallychart',
            chartData: this._getChartData(dates, opened, closed, active),
            chartConfig: this._getChartConfig(),
            chartColors: ['#ff0000', '#adff2f', '#00008b']
        });

        this.add(this.chart);
        this.chart._unmask();

    },
    _getChartData: function (array, opened, closed, active) {
        return {
            categories: array,
            series: [
                {
                    name: 'Create Defects',
                    data: opened

                },
                {
                    name: 'Close Defects',
                    data: closed

                },
                {
                    name: 'Active Defects',
                    type: 'line',
                    data: active

                }

            ]
        };
    },

    _getChartConfig: function () {
        return {
            chart: {
                type: 'column'
            },
            title: {
                text: 'Defect Arrival and Kill Rate'
            },
            xAxis: {
                title: {
                    text: 'Date'
                }
            },
            yAxis: {
                min: 0,
                title: {
                    text: 'Count'
                }
            },
            tooltip: {
                headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
                pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
                '<td style="padding:0"><b>{point.y}</b></td></tr>',
                footerFormat: '</table>',
                shared: true,
                useHTML: true
            },
            plotOptions: {
                column: {
                    pointPadding: 0.01,
                    borderWidth: 0,
                    width: 0.2
                },
                series: {
                    marker: {
                        enabled: false,
                        states: {
                            hover: {
                                enabled: true
                            }
                        }
                    },
                    groupPadding: 0.05
                }
            }
        };
    }
});