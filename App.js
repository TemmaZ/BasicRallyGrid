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

        this._loadDateForChart();

    },

    _loadDateForChart: function(){
        var end = new Date();
        var start = Ext.Date.add(end, Ext.Date.MONTH, -1);

        this.startDate = Ext.create('Ext.form.field.Date',{
            fieldLabel: 'Start Date:',
            labelAlign: 'right',
            value: start,
            maxValue: end,
            listeners: {
                select: function(combobox, records){
                    this.startChartDate = records;
                    if(this.endDate){
                        this.endDate.setMinValue(records);
                    }
                    this._loadData();
                },
                scope: this
            }
        });

        this.myLayout.add(this.startDate);

        this.endDate = Ext.create('Ext.form.field.Date',{
            fieldLabel: 'End Date:',
            labelAlign: 'right',
            minValue: start,
            value: end,
            maxValue: end,
            listeners: {
                select: function(combobox, records){
                    this.endChartDate = records;
                    if(this.startDate){
                        this.startDate.setMaxValue(records);
                    }
                    this._loadData();
                },
                scope: this
            }
        });

        /*this.projectNameSelect = Ext.create('Rally.ui.combobox.ComboBox',{
            renderTo: document.body,
            queryMode: 'local',
            fieldLabel: 'Show data from Project ',
            labelAlign: 'right',
            store: new Ext.data.ArrayStore({
                id: 0,
                fields: [
                    'idText',
                    'text'
                ],
                data: [['All', 'All'],['aa', 'QQQQQQQQQQQ']]
            }),
            valueField: 'idText',
            displayField: 'text',
            triggerAction: 'all',
            listeners: {
                select: function(combobox, records){
                    this._loadData();
                },
                scope: this
            }
        });*/

        this.startChartDate = start;
        this.endChartDate = end;
        this.myLayout.add(this.endDate);
        //this.myLayout.add(this.projectNameSelect);
        //this.projectNameSelect.select('All');
        this._loadData();
    },

    _loadData: function(){
        if (this.chart) {
            this.remove(this.chart);
        }
        this.startDate.setDisabled(true);
        this.endDate.setDisabled(true);
        //console.log(Ext.Date.format(this.endChartDate, 'Y-m-d'));
        var filter1 = Ext.create('Rally.data.wsapi.Filter',{
            property: 'CreationDate',
            operator: '>=',
            value: Ext.Date.format(this.startChartDate, 'Y-m-d')
        });
        var filter2 = Ext.create('Rally.data.wsapi.Filter',{
            property: 'CreationDate',
            operator: '<=',
            value: Ext.Date.format(this.endChartDate, 'Y-m-d')
        });
        var filter3 = Ext.create('Rally.data.wsapi.Filter',{
            property: 'Environment',
            operator: '=',
            value: 'Production'
        });
        var filter4 = Ext.create('Rally.data.wsapi.Filter',{
            property: 'c_IssueType',
            operator: '=',
            value: 'Bug'
        });

        var filter = filter1.and(filter2).and(filter3).and(filter4);
        if(this.myStore){
            this.myStore.setFilter(filter);
            this.myStore.load();
        }else {
            this.myStore = Ext.create('Rally.data.wsapi.Store', {
                model: 'Defect',
                autoLoad: true,
                filters: filter,
                listeners: {
                    load: function (myStore, myData, success) {
                        this._createChart(myStore);
                    },
                    scope: this
                },
                limit: Infinity
            });
        }
        this.startDate.setDisabled(false);
        this.endDate.setDisabled(false);

    },

    _createChart: function(myStore){
        //console.log(this.startChartDate, this.endChartDate);
        var bufferArrya = [];
        var days = [];
        var countDay  =  ~~((this.endChartDate - this.startChartDate)/1000/60/60/24 + 0.5);
        var byMonth;
        var inc = 0;
        var bufferDay = this.startChartDate;
        var indexInDaysArray = new Map();
        if(countDay >= 240){
            byMonth = new Map();
            for(;Ext.Date.format(bufferDay, 'M Y') != Ext.Date.format(this.endChartDate, 'M Y'); bufferDay = Ext.Date.add(bufferDay, Ext.Date.MONTH, 1)){
                var string = Ext.Date.format(bufferDay, 'M Y');
                byMonth.set(string, days.length);
                days.push(string);
                bufferArrya.push(0);
            }
            byMonth.set(Ext.Date.format(bufferDay, 'M Y'), days.length);
            days.push(Ext.Date.format(bufferDay, 'M Y'));
            bufferArrya.push(0);
            indexInDaysArray = new Map(byMonth);
        }else {
            if (countDay > 31) {
                var count;
                for (var del = 31; del >= 12; --del) {
                    var buf = countDay / del;
                    if (buf - (~~buf) <= 0.2) {
                        count = del;
                        break;
                    }
                }
                if (!count) count = 12;
                inc = ~~(countDay / count + 0.5);
            }else{
                inc = 1;
            }
            for(;Ext.Date.format(bufferDay, 'Ymd') < Ext.Date.format(this.endChartDate, 'Ymd'); bufferDay = Ext.Date.add(bufferDay, Ext.Date.DAY, inc)){
                var string = Ext.Date.format(bufferDay, 'M d');
                indexInDaysArray.set(string, days.length);
                days.push(string);
                bufferArrya.push(0);
            }
            indexInDaysArray.set(Ext.Date.format(this.endChartDate, 'M d'), days.length);
            days.push(Ext.Date.format(this.endChartDate, 'M d'));
            bufferArrya.push(0);

        }

        //console.log(buffer, severity);
        var map = new Map();

        console.log(myStore.getCount(), days, days.length, inc);
        this.startChartDate.setHours(0);
        this.startChartDate.setMilliseconds(0);
        this.startChartDate.setMinutes(0);
        this.startChartDate.setSeconds(0);
        var teams = new Set();
        teams.add('IL Finance Team');
        teams.add('IL Ops Team');
        teams.add('Salesforce Team');
        for(var i = 0; i < myStore.getCount(); ++i){
            var el = myStore.getAt(i).data;
            console.log(i, el);
            var projectName = el.Project.Name;
            if(teams.has(projectName)) continue;
            var date = el.CreationDate;
            date.setMilliseconds(0);
            date.setMinutes(0);
            date.setSeconds(0);
            date.setHours(0);
            if(!map.has(projectName)){
                map.set(projectName, bufferArrya.slice());
            }
            var index;
            if(byMonth){
                index = byMonth.get(Ext.Date.format(date, 'M Y'));
            }else{
                index = ~~((date - this.startChartDate)/1000/60/60/24/inc + 0.999);
            }
            console.log(index);
            map.get(projectName)[index]++;
        }
        var chartData = {
            categories: days,
            series: []
        };
        //var dataForSelect = [['All', 'All']];
        //var selectedProjetc = this.projectNameSelect.getRecord().get('text');
        //var isAll = selectedProjetc == 'All';
        this.allArraySum = bufferArrya.slice();
        var colors = [];
        var buff = map.keys();
        var a = buff.next();
        var step = 0;
        var point = 0;
        var numOfStep = map.size;
        var priority = map.size-1;
        while(!a.done){
            //dataForSelect.push([a.value,a.value]);
            //if(isAll || selectedProjetc == a.value){
                var array = this._sumOfArrayForChart(map.get(a.value));
                var buffer = {
                    name: a.value,
                    data: array,
                    pointPadding: -1,
                    pointPlacement: 0,
                    zIndex: priority--
                };
                chartData.series.push(buffer);
                colors.push(this._createColor(numOfStep, step++));
            //}
            a = buff.next();
        }
        //this.projectNameSelect.store.data = dataForSelect;
        console.log(chartData, colors);
        //this.remove(this.chart);
        ////console.log(this.chart);
        this.chart = Ext.create('Rally.ui.chart.Chart', {
            xtype: 'rallychart',
            chartData: chartData,
            chartConfig: this._getChartConfig(map, indexInDaysArray),
            chartColors: colors
        });

        this.add(this.chart);
        this.chart._unmask();

    },

    _sumOfArrayForChart: function(arrya){
        for(var i in  arrya){
            //if(arrya[i] != 0){
                arrya[i] += this.allArraySum[i];
                this.allArraySum[i] = arrya[i];
         //   }
        }

        return arrya;
    },

    _getChartConfig: function (map, indexInDaysArray) {
        return {
            chart:{
              type: 'area'
            },
            title: {
                text: 'Escaped Defects Overtime'
            },
            xAxis: {
                labels: {
                    rotation: -45,
                    align: 'right',
                    style: {
                        fontSize: '11px',
                        fontFamily: 'Verdana, sans-serif'
                    }
                },
                tickmarkPlacement: 'on',
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
                }
            }
        };
    },

    _createColor: function rainbow(numOfSteps, step) {
        // This function generates vibrant, "evenly spaced" colours (i.e. no clustering). This is ideal for creating easily distinguishable vibrant markers in Google Maps and other apps.
        // Adam Cole, 2011-Sept-14
        // HSV to RBG adapted from: http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
        var r, g, b;
        var h = step / numOfSteps;
        var i = ~~(h * 6);
        var f = h * 6 - i;
        var q = 1 - f;
        switch(i % 6){
            case 0: r = 1; g = f; b = 0; break;
            case 1: r = q; g = 1; b = 0; break;
            case 2: r = 0; g = 1; b = f; break;
            case 3: r = 0; g = q; b = 1; break;
            case 4: r = f; g = 0; b = 1; break;
            case 5: r = 1; g = 0; b = q; break;
        }
        var c = "#" + ("00" + (~ ~(r * 255)).toString(16)).slice(-2) + ("00" + (~ ~(g * 255)).toString(16)).slice(-2) + ("00" + (~ ~(b * 255)).toString(16)).slice(-2);
        return (c);
    }

});