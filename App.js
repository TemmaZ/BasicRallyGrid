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
            listeners: {
                ready: function (combobox) {
                    this._loadData();
                },
                select: function(combobox, records){
                    this._loadData();
                },
                scope: this
            }
        });

        this.myLayout.add(this.priorityComboBox);
    },

    _loadData: function(){
        var selectedSeverity = this.severityComboBox.getRecord().get('value');
        var selectedPriority = this.priorityComboBox.getRecord().get('value');
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
                        this._createChart(myStore);
                    },
                    scope: this
                },
                fetch: ['FormattedID', 'Name', 'Requirement', 'Severity', 'OpenedDate', 'ClosedDate']
            });
        }

    },

    _creatGrid: function(myStore){
        this.myGrid = Ext.create('Rally.ui.grid.Grid', {
            store: myStore,
            columnCfgs: [
                'FormattedID', 'Name', 'Requirement', 'Severity', 'OpenedDate', 'ClosedDate'
            ]
        });
        this.add(this.myGrid);
    },

    _createChart: function(myStore){

        var endChartDate = new Date(Date.now());
        //console.log(Ext.Date.format(endChartDate, 'Y-m-d'));
        var startChartDate = Ext.Date.add(endChartDate, Ext.Date.MONTH, -1);
        //console.log(Ext.Date.format(startChartDate, 'Y-m-d'));
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
        for(var i = 0; i < myStore.getCount(); ++i){
            //if(i == 0 || i == 2) //console.log(myStore.getAt(i));
            var el = myStore.getAt(i).data;
            if(el.OpenedDate) {
                buffer = new Date(el.OpenedDate);
                var startIndex = Ext.Date.getDayOfYear(buffer);
                if(numberOfStartDate <= startIndex && startIndex <= numberOfEndDate){
                    opened[startIndex - numberOfStartDate]++;
                }
                if(el.ClosedDate){
                    buffer = new Date(el.ClosedDate);
                    var endIndex = Ext.Date.getDayOfYear(buffer);
                    if(numberOfStartDate <= endIndex && endIndex <= numberOfEndDate){
                        closed[endIndex - numberOfStartDate]++;
                    }
                    for(var k = startIndex; k < endIndex; ++k){
                        active[k - numberOfStartDate]++;
                    }
                }else{
                    for(var k = startIndex; k <= numberOfEndDate; ++k){
                        active[k - numberOfStartDate]++;
                    }
                }
            }else if(el.ClosedDate){
                buffer = new Date(el.ClosedDate);
                var endIndex = Ext.Date.getDayOfYear(buffer);
                if(numberOfStartDate <= endIndex && endIndex <= numberOfEndDate) {
                    closed[endIndex - numberOfStartDate]++;
                }
            }

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
                    name: 'Open Defects',
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