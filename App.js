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
        var filters = [];
        filters.push(Ext.create('Rally.data.wsapi.Filter',{
            property: 'Environment',
            operator: '!=',
            value: 'Production'
        }));
        filters.push(Ext.create('Rally.data.wsapi.Filter',{
            property: 'Environment',
            operator: '!=',
            value: 'DR Site'
        }));
        filters.push(Ext.create('Rally.data.wsapi.Filter',{
            property: 'c_IssueType',
            operator: '=',
            value: 'Bug'
        }));
        filters.push(Ext.create('Rally.data.wsapi.Filter',{
            property: 'Resolution',
            operator: '!=',
            value: 'Duplicate'
        }));
        filters.push(Ext.create('Rally.data.wsapi.Filter',{
            property: 'Resolution',
            operator: '!=',
            value: 'Future Enhancement'
        }));
        filters.push(Ext.create('Rally.data.wsapi.Filter',{
            property: 'Resolution',
            operator: '!=',
            value: 'Cannot Replicate'
        }));

        this.myFilter = filters[0];
        for(var i = 1; i < filters.length; ++i) this.myFilter = this.myFilter.and(filters[i]);

        var cb = Ext.create('Rally.ui.combobox.FieldValueComboBox',{
            model: 'Defect',
            field: 'Severity',
            listeners: {
                ready: function (combobox) {
                    var arrayData = cb.getStore();
                    arrayData = arrayData.data.items;
                    this.categoriesForChart = [];
                    for(var i = 0; i < arrayData.length; ++i) {
                        var value = arrayData[i].data.value;
                        this.categoriesForChart.push(value);
                    }
                    this._loadStartDateForChart();
                },
                scope: this
            }
        });
        this.add(cb);
        cb.setVisible(false);
    },

    _loadStartDateForChart: function(myStore){
        this.sprintStartComboBox  = Ext.create('Rally.ui.combobox.IterationComboBox',{
            fieldLabel: 'Start Sprint:',
            labelAlign: 'right',
            listeners:{
                ready: function(combobox){
                   this._loadEndDateForChart();
                },
                select: function(combobox, records){
                    this._loadData();
                },
                scope: this
            },
            labelWidth: 100,
            width: 300
        });
        this.myLayout.add(this.sprintStartComboBox);
    },


    _loadEndDateForChart: function(){
        this.sprntEndComboBox  = Ext.create('Rally.ui.combobox.IterationComboBox',{
            fieldLabel: 'End Sprint:',
            labelAlign: 'right',
            listeners:{
                ready: function(comobox){
                    this.mySprintModel = this.sprintStartComboBox.getStore();
                    console.log(this.mySprintModel);
                    this._loadData();
                },
                select: function(combobox, records){
                    this._loadData();
                },
                scope: this
            },
            labelWidth: 100,
            width: 300
        });
        this.myLayout.add(this.sprntEndComboBox);
    },

    _loadData: function(){
        if (this.chart) {
            this.remove(this.chart);
        }
        console.log(this.mySprintModel);
        this.startIndex = this.sprintStartComboBox.getRecord().index;
        this.endIndex = this.sprntEndComboBox.getRecord().index;

        var status = Ext.create('Rally.data.wsapi.Filter',{
            property: 'State',
            operator: '!=',
            value: 'Closed'
        });
        var releaseFilter;
        this.sprintByName = new Map();
        var size = 0;
        for(var index = this.startIndex; index >= this.endIndex; --index){
            var el = this.mySprintModel.getAt(index).data;
            var openStart = Ext.create('Rally.data.wsapi.Filter',{
                property: 'CreationDate',
                operator: '>',
                value: Ext.Date.format(Ext.Date.add(el.StartDate, Ext.Date.DAY, -1), 'Y-m-d')
            });
            var openEnd = Ext.create('Rally.data.wsapi.Filter',{
                property: 'CreationDate',
                operator: '<',
                value: Ext.Date.format(Ext.Date.add(el.EndDate, Ext.Date.DAY, +1), 'Y-m-d')
            });
            var someFilter = status;
            someFilter = someFilter.and(openStart).and(openEnd);
            this.sprintByName.set(el.formattedName, size++);
            if(releaseFilter){
                releaseFilter = releaseFilter.or(someFilter);
            }else{
                releaseFilter = someFilter;
            }
        }
        var needFilter = this.myFilter.and(releaseFilter);
        console.log(needFilter.toString());
        if(this.myStore){
            this.myStore.setFilter(needFilter);
            this.myStore.load();
        }else {
            this.myStore = Ext.create('Rally.data.wsapi.Store', {
                model: 'Defect',
                autoLoad: true,
                filters: needFilter,
                listeners: {
                    load: function (myStore, myData, success) {
                        this._createChart(myStore);
                    },
                    scope: this
                },
                limit: Infinity
            });
        }

    },
    _createChart: function(store){
        var bufferArray = [];
        var releaseNames = [];
        for(var index = this.startIndex; index >= this.endIndex; --index){
            bufferArray.push(0);
            releaseNames.push(this.mySprintModel.getAt(index).data.formattedName);
        }
        this.myMap = new Map();
        for(var i = 0; i < this.categoriesForChart.length; ++i) {
            this.myMap.set(this.categoriesForChart[i], bufferArray.slice());
        }
        for(i = 0; i < store.getCount(); ++i){
            var el = store.getAt(i).data;
            if(!el.Requirement) continue;
            index = 0;
            if(el.Iteration){
                index = this.sprintByName.get(el.Iteration.Name);
            }else {
                var date = el.CreationDate;
                for (var ind = this.startIndex; ind >= this.endIndex; --ind) {
                    var it = this.mySprintModel.getAt(ind).data;
                    var start = it.StartDate;
                    var end = it.EndDate;
                    if (start <= date && date <= end) break;
                    ++index;
                }
            }
            (this.myMap.get(el.Severity))[index]++;
            console.log(i, el, this.myMap);
        }

        var chartData = {
            categories: releaseNames,
            series: []
        };


        var buff = this.myMap.keys();
        var a = buff.next();
        var colors = [];
        var step = 0;
        var numOfStep = this.myMap.size;
        while(!a.done){
            var buffer = {
                name: a.value,
                data: this.myMap.get(a.value)
            };
            chartData.series.push(buffer);
            colors.push(this._createColor(numOfStep, step++));
            a = buff.next();
        }
        this.chart = Ext.create('Rally.ui.chart.Chart', {
            xtype: 'rallychart',
            chartData: chartData,
            chartConfig: this._getChartConfig(),
            chartColors: colors
        });

        this.add(this.chart);
        this.chart._unmask();
    },

    _getChartConfig: function () {
        return {
            chart: {
              type: 'column'
            },
            title: {
                text: ''
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
                series: {
                    stacking: 'normal'
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