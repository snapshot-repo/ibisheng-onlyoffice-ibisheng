function CGraphicObjects(slide)
{
    this.slide = slide;
    this.State = new NullState(this, this.slide);

    this.selectedObjects = [];
    this.arrPreTrackObjects = [];
    this.arrTrackObjects = [];
}

CGraphicObjects.prototype = {

    resetSelectionState: function()
    {
        var count = this.selectedObjects.length;
        while(count > 0)
        {
            this.selectedObjects[0].deselect(this);
            --count;
        }
        this.changeCurrentState(new NullState(this, this.slide));
    },

    resetSelection: function()
    {
        var count = this.selectedObjects.length;
        while(count > 0)
        {
            this.selectedObjects[0].deselect(this);
            --count;
        }
    },

    paragraphAdd: function(paraItem, bRecalculate)
    {
        switch (this.State.id)
        {
            case STATES_ID_TEXT_ADD:
            case STATES_ID_TEXT_ADD_IN_GROUP:
            case STATES_ID_CHART_TEXT_ADD:

            {
                if(editor.WordControl.m_oLogicDocument.Document_Is_SelectionLocked(changestype_Drawing_Props) === false)
                {
                    History.Create_NewPoint();
                    this.State.textObject.paragraphAdd(paraItem, bRecalculate);
                    //this.State.textObject.recalculate();
                    //this.updateSelectionState();
                }
                break;
            }
            case STATES_ID_NULL:
            {
                if(paraItem.Type === para_TextPr)
                {
                    if(editor.WordControl.m_oLogicDocument.Document_Is_SelectionLocked(changestype_Text_Props) === false)
                    {
                        for(var i = 0; i < this.selectedObjects.length; ++i)
                        {
                            if(typeof this.selectedObjects[i].applyAllTextProps === "function")
                            {
                                this.selectedObjects[i].applyAllTextProps(paraItem);
                            }
                        }
                    }
                }
                else
                {
                    if(this.selectedObjects.length === 1)
                    {
                        if(typeof this.selectedObjects[0].paragraphAdd === "function")
                        {
                            if(editor.WordControl.m_oLogicDocument.Document_Is_SelectionLocked(changestype_Drawing_Props) === false)
                            {
                                this.selectedObjects[0].paragraphAdd(paraItem, bRecalculate);
                                //this.selectedObjects[0].recalculate();
                                this.changeCurrentState(new TextAddState(this, this.slide, this.selectedObjects[0]));
                                //this.updateSelectionState();
                            }
                        }
                    }
                }
                break;
            }
        }
        editor.WordControl.m_oLogicDocument.Recalculate();
    },


    Update_CursorType: function(x, y,  e )
    {
        switch(this.State.id)
        {
            case STATES_ID_GROUP:
            case STATES_ID_TEXT_ADD_IN_GROUP:
            {
                break;
            }
            default :
            {
                var selected_objects = this.selectedObjects;
                var drawingDocument = editor.WordControl.m_oLogicDocument.DrawingDocument;
                if(selected_objects.length === 1)
                {
                    var hit_to_adj = selected_objects[0].hitToAdjustment(x, y);
                    if(hit_to_adj.hit)
                    {
                        if(selected_objects[0].canChangeAdjustments())
                        {
                            drawingDocument.SetCursorType("crosshair");
                            selected_objects[0].sendMouseData();
                        }
                        return;
                    }
                }

                for(var i = selected_objects.length - 1; i > -1; --i)
                {
                    var hit_to_handles = selected_objects[i].hitToHandles(x, y);
                    if(hit_to_handles > -1)
                    {
                        if(hit_to_handles === 8)
                        {
                            if(!selected_objects[i].canRotate())
                                return;
                            selected_objects[0].sendMouseData();
                            drawingDocument.SetCursorType("crosshair");
                        }
                        else
                        {
                            if(!selected_objects[i].canResize())
                                return;
                            var card_direction = selected_objects[i].getCardDirectionByNum(hit_to_handles);
                            drawingDocument.SetCursorType(CURSOR_TYPES_BY_CARD_DIRECTION[card_direction]);
                            selected_objects[i].sendMouseData();

                        }
                        return;
                    }
                }

                for(i = selected_objects.length - 1; i > -1; --i)
                {
                    if(selected_objects[i].hitInBoundingRect(x, y))
                    {
                        if(!selected_objects[i].canMove())
                            return;
                        drawingDocument.SetCursorType("move");
                        selected_objects[i].sendMouseData();
                        return;
                    }
                }

                var arr_drawing_objects = this.slide.getDrawingObjects();
                for(i = arr_drawing_objects.length-1; i > -1; --i)
                {
                    var cur_drawing_base = arr_drawing_objects[i];
                    var cur_drawing = cur_drawing_base;
                    if(cur_drawing.isShape() || cur_drawing.isImage())
                    {
                        var hit_in_inner_area = cur_drawing.hitInInnerArea(x, y);
                        var hit_in_path = cur_drawing.hitInPath(x, y);
                        var hit_in_text_rect = cur_drawing.hitInTextRect(x, y);
                        if(hit_in_inner_area && !hit_in_text_rect || hit_in_path)
                        {

                            drawingDocument.SetCursorType("move");
                            cur_drawing.sendMouseData();
                            return;
                        }
                        else if(hit_in_text_rect)
                        {
                            cur_drawing.updateCursorType(x, y, e);
                            cur_drawing.sendMouseData();

                            return;
                        }
                    }
                    else if(cur_drawing.isGroup())
                    {
                        var grouped_objects = cur_drawing.getArrGraphicObjects();
                        for(var j = grouped_objects.length - 1; j > -1; --j)
                        {
                            var cur_grouped_object = grouped_objects[j];
                            var hit_in_inner_area = cur_grouped_object.hitInInnerArea(x, y);
                            var hit_in_path = cur_grouped_object.hitInPath(x, y);
                            var hit_in_text_rect = cur_grouped_object.hitInTextRect(x, y);
                            if(hit_in_inner_area && !hit_in_text_rect || hit_in_path)
                            {

                                cur_drawing.sendMouseData();

                                drawingDocument.SetCursorType("move");
                                return;
                            }
                            else if(hit_in_text_rect)
                            {
                                cur_drawing.sendMouseData();

                                grouped_objects[j].txBody.updateCursorType(x, y, e);
                                return;
                            }
                        }
                    }
                    else if(cur_drawing.isChart())
                    {
                        /*if(cur_drawing.hitInWorkArea(x, y))
                        {

                            if(!e.ShiftKey && !e.CtrlKey)
                            {
                                var object_for_move_in_chart = null;
                                if(isRealObject(cur_drawing.chartTitle))
                                {
                                    if(cur_drawing.chartTitle.hit(x, y))
                                    {
                                        object_for_move_in_chart = cur_drawing.chartTitle;
                                    }
                                }

                                if(isRealObject(cur_drawing.hAxisTitle) && !isRealObject(object_for_move_in_chart))
                                {
                                    if(cur_drawing.hAxisTitle.hit(x, y))
                                    {
                                        object_for_move_in_chart = cur_drawing.hAxisTitle;
                                    }
                                }

                                if(isRealObject(cur_drawing.vAxisTitle) && !isRealObject(object_for_move_in_chart))
                                {
                                    if(cur_drawing.vAxisTitle.hit(x, y))
                                    {
                                        object_for_move_in_chart = cur_drawing.vAxisTitle;
                                    }
                                }
                                if(isRealObject(object_for_move_in_chart))
                                {
                                    this.drawingObjectsController.resetSelection();
                                    cur_drawing.select(this.drawingObjectsController);
                                    object_for_move_in_chart.select();
                                    this.drawingObjectsController.clearPreTrackObjects();
                                    this.drawingObjectsController.addPreTrackObject(new MoveTitleInChart(object_for_move_in_chart));
                                    this.drawingObjectsController.changeCurrentState(new PreMoveInternalChartObjectState(this.drawingObjectsController, this.drawingObjects, x, y, object_for_move_in_chart));
                                    this.drawingObjects.OnUpdateOverlay();
                                    return;
                                }
                                this.drawingObjectsController.clearPreTrackObjects();
                                var is_selected = cur_drawing.selected;
                                if(!(e.CtrlKey || e.ShiftKey) && !is_selected)
                                    this.drawingObjectsController.resetSelection();
                                cur_drawing.select(this.drawingObjectsController);
                                this.drawingObjects.OnUpdateOverlay();
                                for(var j = 0; j < selected_objects.length; ++j)
                                {
                                    this.drawingObjectsController.addPreTrackObject(selected_objects[j].createMoveTrack());
                                }
                                this.drawingObjectsController.changeCurrentState(new PreMoveState(this.drawingObjectsController, this.drawingObjects,x, y, e.ShiftKey, e.ctrl, cur_drawing, is_selected, true));
                                return;
                            }



                        }  */
                    }
                    else if(cur_drawing.isTable && cur_drawing.isTable())
                    {
                        /*var hit_in_inner_area = cur_drawing.hitInInnerArea(x, y);
                        var hit_in_bounding_rect = cur_drawing.hitInBoundingRect(x, y);
                        if(hit_in_bounding_rect || hit_in_inner_area)
                        {
                            if(e.CtrlKey && this.drawingObjectsController.selectedObjects.length > 0)
                            {
                                var b_selected = cur_drawing.selected;
                                cur_drawing.select(this.drawingObjectsController);
                                for(var j = 0; j < this.drawingObjectsController.selectedObjects.length; ++j)
                                {
                                    this.drawingObjectsController.addPreTrackObject(this.drawingObjectsController.selectedObjects[j].createMoveTrack());
                                }
                                this.drawingObjectsController.changeCurrentState(new PreMoveState(this.drawingObjectsController, this.drawingObjects, x, y, e.ShiftKey, e.CtrlKey, cur_drawing, b_selected, true));
                                this.drawingObjects.OnUpdateOverlay();
                                return;
                            }
                            else
                            {
                                this.drawingObjectsController.resetSelection();
                                cur_drawing.select(this.drawingObjectsController);
                                cur_drawing.selectionSetStart(e, x, y);
                                this.drawingObjectsController.changeCurrentState(new TextAddState(this.drawingObjectsController, this.drawingObjects, cur_drawing));
                                this.drawingObjects.presentation.Document_UpdateSelectionState();
                                this.drawingObjects.OnUpdateOverlay();
                                return;

                            }
                        }     */

                    }
                }
                drawingDocument.SetCursorType("default");
                break;
            }
        }

    },

    setParagraphAlign: function(val)
    {
        switch (this.State.id)
        {
            case STATES_ID_TEXT_ADD:
            case STATES_ID_TEXT_ADD_IN_GROUP:
            {
                if(editor.WordControl.m_oLogicDocument.Document_Is_SelectionLocked(changestype_Drawing_Props) === false)
                {
                    this.State.textObject.setParagraphAlign(val);
                    //this.State.textObject.recalculate();
                    //this.updateSelectionState();
                }
                break;
            }
            case STATES_ID_NULL:
            {
                if(editor.WordControl.m_oLogicDocument.Document_Is_SelectionLocked(changestype_Text_Props) === false)
                {
                    for(var i = 0; i < this.selectedObjects.length; ++i)
                    {
                        if(typeof this.selectedObjects[i].applyAllAlign === "function")
                        {
                            this.selectedObjects[i].applyAllAlign(val);
                        }
                    }
                }
                break;
            }
        }
    },


    setParagraphTabs: function(val)

    {
        switch (this.State.id)
        {
            case STATES_ID_TEXT_ADD:
            case STATES_ID_TEXT_ADD_IN_GROUP:
            {
                if(editor.WordControl.m_oLogicDocument.Document_Is_SelectionLocked(changestype_Drawing_Props) === false)
                {
                    this.State.textObject.setParagraphTabs(val);
                    //this.State.textObject.recalculate();
                    //this.updateSelectionState();
                }
                break;
            }
            case STATES_ID_NULL:
            {
                if(editor.WordControl.m_oLogicDocument.Document_Is_SelectionLocked(changestype_Text_Props) === false)
                {
                    for(var i = 0; i < this.selectedObjects.length; ++i)
                    {
                        if(typeof this.selectedObjects[i].applyAllSpacing === "function")
                        {
                            this.selectedObjects[i].applyAllSpacing(val);
                        }
                    }
                }
                break;
            }
        }
    },

    setParagraphSpacing: function(val)
    {
        switch (this.State.id)
        {
            case STATES_ID_TEXT_ADD:
            case STATES_ID_TEXT_ADD_IN_GROUP:
            {
                if(editor.WordControl.m_oLogicDocument.Document_Is_SelectionLocked(changestype_Drawing_Props) === false)
                {
                    this.State.textObject.setParagraphSpacing(val);
                    //this.State.textObject.recalculate();
                    //this.updateSelectionState();
                }
                break;
            }
            case STATES_ID_NULL:
            {
                if(editor.WordControl.m_oLogicDocument.Document_Is_SelectionLocked(changestype_Text_Props) === false)
                {
                    for(var i = 0; i < this.selectedObjects.length; ++i)
                    {
                        if(typeof this.selectedObjects[i].applyAllSpacing === "function")
                        {
                            this.selectedObjects[i].applyAllSpacing(val);
                        }
                    }
                }
                break;
            }
        }
    },

    setParagraphIndent: function(val)
    {
        switch (this.State.id)
        {
            case STATES_ID_TEXT_ADD:
            case STATES_ID_TEXT_ADD_IN_GROUP:
            {
                if(editor.WordControl.m_oLogicDocument.Document_Is_SelectionLocked(changestype_Drawing_Props) === false)
                {
                    this.State.textObject.setParagraphIndent(val);
                    //this.State.textObject.recalculate();
                    //this.updateSelectionState();
                }
                break;
            }
            case STATES_ID_NULL:
            {
                if(editor.WordControl.m_oLogicDocument.Document_Is_SelectionLocked(changestype_Text_Props) === false)
                {
                    for(var i = 0; i < this.selectedObjects.length; ++i)
                    {
                        if(typeof this.selectedObjects[i].applyAllIndent === "function")
                        {
                            this.selectedObjects[i].applyAllIndent(val);
                        }
                    }
                }
                break;
            }
        }
    },

    setParagraphNumbering: function(val)
    {
        switch (this.State.id)
        {
            case STATES_ID_TEXT_ADD:
            case STATES_ID_TEXT_ADD_IN_GROUP:
            {
                if(editor.WordControl.m_oLogicDocument.Document_Is_SelectionLocked(changestype_Drawing_Props) === false)
                {
                    this.State.textObject.setParagraphNumbering(val);
                }
                break;
            }
            case STATES_ID_NULL:
            {
                if(editor.WordControl.m_oLogicDocument.Document_Is_SelectionLocked(changestype_Text_Props) === false)
                {
                    for(var i = 0; i < this.selectedObjects.length; ++i)
                    {
                        if(typeof this.selectedObjects[i].applyAllNumbering === "function")
                        {
                            this.selectedObjects[i].applyAllNumbering(val);
                        }
                    }
                }
                break;
            }
        }
    },

    Paragraph_IncDecFontSize: function(val)
    {
        switch (this.State.id)
        {
            case STATES_ID_TEXT_ADD:
            case STATES_ID_TEXT_ADD_IN_GROUP:
            {
                if(editor.WordControl.m_oLogicDocument.Document_Is_SelectionLocked(changestype_Drawing_Props) === false)
                {
                    this.State.textObject.Paragraph_IncDecFontSize(val);
                }
                break;
            }
            case STATES_ID_NULL:
            {
                if(editor.WordControl.m_oLogicDocument.Document_Is_SelectionLocked(changestype_Text_Props) === false)
                {
                    for(var i = 0; i < this.selectedObjects.length; ++i)
                    {
                        if(typeof this.selectedObjects[i].Paragraph_IncDecFontSizeAll === "function")
                        {
                            this.selectedObjects[i].Paragraph_IncDecFontSizeAll(val);
                        }
                    }
                }
                break;
            }
        }
    },

    Set_ImageProps: function(Props)
    {

    },

    getSelectedArraysByTypes: function()
    {
        var selected_objects = this.selectedObjects;
        var tables = [], charts = [], shapes = [], images = [], groups = [];
        for(var i = 0; i < selected_objects.length; ++i)
        {
            var selected_object = selected_objects[i];
            if(typeof  selected_object.isTable === "function" && selected_object.isTable())
            {
                tables.push(selected_object);
            }
            else if(typeof  selected_object.isChart === "function" && selected_object.isChart())
            {
                charts.push(selected_object);
            }
            else if(selected_object.isShape())
            {
                shapes.push(selected_object);
            }
            else if(selected_object.isImage())
            {
                images.push(selected_object);
            }
            else if(typeof  selected_object.isGroup())
            {
                groups.push(selected_object);
            }
        }
        return {tables: tables, charts: charts, shapes: shapes, images: images, groups: groups};
    },


    setTableProps: function(props)
    {
        if(this.selectedObjects.length ===1 && this.selectedObjects[0].isTable && this.selectedObjects[0].isTable())
        {
            this.selectedObjects[0].graphicObject.Set_Props(props);
        }
    },

    Document_UpdateInterfaceState: function()
    {
        var text_props = null, para_props = null, shape_props = null, image_props = null, chart_props = null, table_props = null;
        var selected_objects = this.selectedObjects;
        var by_types = this.getSelectedArraysByTypes();
        switch(this.State.id)
        {
            case STATES_ID_NULL:
            case STATES_ID_TEXT_ADD:
           // case STATES_ID_TEXT_ADD_IN_GROUP:
            {
                var images = by_types.images;
                for(var i = 0; i < images.length; ++i)
                {
                    var _cur_image_prop = images[i].getImageProps();
                    if(_cur_image_prop !== null)
                    {
                        if(image_props === null)
                        {
                            image_props = _cur_image_prop;
                        }
                        else
                        {
                            image_props = CompareImageProperties(image_props, _cur_image_prop);
                        }
                    }
                }
                var shapes = by_types.shapes;
                for(var i = 0; i < shapes.length; ++i)
                {
                    var _current_object = shapes[i];
                    var _cur_shape_prop =
                    {
                        type: _current_object.getPresetGeom(),
                        fill: _current_object.getFill(),
                        stroke: _current_object.getStroke(),
                        canChangeArrows: _current_object.canChangeArrows(),
                        IsLocked: !(_current_object.Lock.Type === locktype_None || _current_object.Lock.Type === locktype_Mine),
                        verticalTextAlign: _current_object.txBody ? _current_object.txBody.getCompiledBodyPr().anchor : undefined,
                        paddings: _current_object.getPaddings(),
                        w:_current_object.extX,
                        h:_current_object.extY
                    };

                    if(shape_props === null)
                    {
                        shape_props = _cur_shape_prop;
                    }
                    else
                    {
                        shape_props = CompareShapeProperties(shape_props, _cur_shape_prop);
                        shape_props.verticalTextAlign = undefined;
                    }

                    var _cur_paragraph_para_pr = _current_object.getParagraphParaPr();
                    if(_current_object.Lock.Is_Locked())
                    {
                        _cur_paragraph_para_pr.Locked = true;
                    }
                    if(_cur_paragraph_para_pr != null)
                    {
                        if(para_props === null)
                        {
                            para_props = _cur_paragraph_para_pr;
                        }
                        else
                        {
                            para_props = para_props.Compare(_cur_paragraph_para_pr)
                        }
                    }
                    var _cur_paragraph_text_pr = _current_object.getParagraphTextPr();
                    if(_cur_paragraph_text_pr != null)
                    {
                        if(text_props === null)
                        {
                            text_props = _cur_paragraph_text_pr;
                        }
                        else
                        {
                            text_props = text_props.Compare(_cur_paragraph_text_pr)
                        }
                    }
                }

                var groups = by_types.groups;
                for(var i = 0; i < groups.length; ++i)
                {
                    var cur_group = groups[i];
                    var arr_by_types = cur_group.getArraysByTypes();
                    var images = arr_by_types.images;
                    for(var i = 0; i < images.length; ++i)
                    {
                        var _cur_image_prop = images[i].getImageProps();
                        if(_cur_image_prop !== null)
                        {
                            if(image_props === null)
                            {
                                image_props = _cur_image_prop;
                            }
                            else
                            {
                                image_props = CompareImageProperties(image_props, _cur_image_prop);
                            }
                        }
                    }

                    var shapes = arr_by_types.shapes;
                    for(var i = 0; i < shapes.length; ++i)
                    {
                        var _current_object = shapes[i];
                        var _cur_shape_prop =
                        {
                            type: _current_object.getPresetGeom(),
                            fill: _current_object.getFill(),
                            stroke: _current_object.getStroke(),
                            canChangeArrows: _current_object.canChangeArrows(),
                            IsLocked: cur_group.Lock.Is_Locked(),
                            verticalTextAlign: _current_object.txBody ? _current_object.txBody.getCompiledBodyPr().anchor : undefined,
                            paddings: _current_object.getPaddings(),
                            w:_current_object.extX,
                            h:_current_object.extY
                        };

                        if(shape_props === null)
                        {
                            shape_props = _cur_shape_prop;
                        }
                        else
                        {
                            shape_props = CompareShapeProperties(shape_props, _cur_shape_prop);
                            shape_props.verticalTextAlign = undefined;
                        }

                        var _cur_paragraph_para_pr = _current_object.getParagraphParaPr();
                        if(_cur_paragraph_para_pr != null)
                        {
                            if(para_props === null)
                            {
                                para_props = _cur_paragraph_para_pr;
                            }
                            else
                            {
                                para_props = para_props.Compare(_cur_paragraph_para_pr)
                            }
                        }
                        var _cur_paragraph_text_pr = _current_object.getParagraphTextPr();
                        if(_cur_paragraph_text_pr != null)
                        {
                            if(text_props === null)
                            {
                                text_props = _cur_paragraph_text_pr;
                            }
                            else
                            {
                                text_props = text_props.Compare(_cur_paragraph_text_pr)
                            }
                        }
                    }

                    if(image_props)
                    {
                        if(cur_group.Lock.Is_Locked())
                        {
                            image_props.IsLocked = true;
                        }
                    }
                    if(shape_props)
                    {
                        if(cur_group.Lock.Is_Locked())
                        {
                            shape_props.IsLocked = true;
                        }
                    }
                    if(para_props)
                    {
                        if(cur_group.Lock.Is_Locked())
                        {
                            para_props.Locked = true;
                        }
                    }
                }

                var tables = by_types.tables;
                if(tables.length === 1)
                {
                    editor.sync_TblPropCallback(tables[0].graphicObject.Get_Props());
                    this.slide.presentation.DrawingDocument.CheckTableStyles(tables[0].graphicObject.Get_TableLook(), tables[0]);
                    var _cur_paragraph_para_pr = tables[0].getParagraphParaPr();
                    if(_cur_paragraph_para_pr != null)
                    {
                        if(para_props === null)
                        {
                            para_props = _cur_paragraph_para_pr;
                        }
                        else
                        {
                            para_props = para_props.Compare(_cur_paragraph_para_pr)
                        }
                    }
                    var _cur_paragraph_text_pr = tables[0].getParagraphTextPr();
                    if(_cur_paragraph_text_pr != null)
                    {
                        if(text_props === null)
                        {
                            text_props = _cur_paragraph_text_pr;
                        }
                        else
                        {
                            text_props = text_props.Compare(_cur_paragraph_text_pr)
                        }
                    }
                }
                break;
            }
        }

        editor.sync_slidePropCallback(this.slide);
        if(this.State.id === STATES_ID_TEXT_ADD || this.State.id === STATES_ID_TEXT_ADD_IN_GROUP)
        {

            if(image_props !== null)
            {
                editor.sync_ImgPropCallback(image_props);
            }

            if(shape_props !== null)
            {
                editor.sync_shapePropCallback(shape_props);
            }

            this.State.textObject.updateInterfaceTextState();
            if(this.State.textObject.isTable && this.State.textObject.isTable())
            {
                editor.sync_TblPropCallback(this.State.textObject.graphicObject.Get_Props());
                this.slide.presentation.DrawingDocument.CheckTableStyles(this.State.textObject.graphicObject.Get_TableLook(), this.State.textObject);
            }
        }
        else
        {
            if(para_props != null)
            {
                editor.UpdateParagraphProp( para_props );

                editor.sync_PrLineSpacingCallBack(para_props.Spacing);
                if(selected_objects.length === 1 )
                {
                    if ( "undefined" != typeof(para_props.Tabs) && null != para_props.Tabs )
                        editor.Update_ParaTab( Default_Tab_Stop, para_props.Tabs );//TODO:
                }
            }
            else
            {
                //editor.sync_PrLineSpacingCallBack(_empty_para_pr.Spacing);
                //editor.UpdateParagraphProp(_empty_para_pr);
            }

            if(text_props != null)
            {
                if(text_props.Bold === undefined)
                    text_props.Bold = false;
                if(text_props.Italic === undefined)
                    text_props.Italic = false;
                if(text_props.Underline === undefined)
                    text_props.Underline = false;
                if(text_props.Strikeout === undefined)
                    text_props.Strikeout = false;
                if(text_props.FontFamily === undefined)
                    text_props.FontFamily = {Index : 0, Name : ""};
                if(text_props.FontSize === undefined)
                    text_props.FontSize = "";
                editor.UpdateTextPr(text_props);
            }
            else
            {
                //   editor.UpdateTextPr(_empty_text_pr);
            }

            if(image_props !== null)
            {
                editor.sync_ImgPropCallback(image_props);
            }

            if(shape_props !== null)
            {
                editor.sync_shapePropCallback(shape_props);
            }
        }

       // editor.sync_VerticalTextAlign(this.getVerticalAlign());
    },

    getPropsArrays: function()
    {
        var text_props = null, para_props = null, shape_props = null, image_props = null, chart_props = null, table_props = null;
        var selected_objects = this.selectedObjects;
        var by_types = this.getSelectedArraysByTypes();
        switch(this.State.id)
        {
            case STATES_ID_NULL:
            {
                var images = by_types.images;
                for(var i = 0; i < images.length; ++i)
                {
                    var _cur_image_prop = images[i].getImageProps();
                    if(_cur_image_prop !== null)
                    {
                        if(image_props === null)
                        {
                            image_props = _cur_image_prop;
                        }
                        else
                        {
                            image_props = CompareImageProperties(image_props, _cur_image_prop);
                        }
                    }
                }
                var shapes = by_types.shapes;
                for(var i = 0; i < shapes.length; ++i)
                {
                    var _current_object = shapes[i];
                    var _cur_shape_prop =
                    {
                        type: _current_object.getPresetGeom(),
                        fill: _current_object.getFill(),
                        stroke: _current_object.getStroke(),
                        canChangeArrows: _current_object.canChangeArrows()
                    };

                    if(shape_props === null)
                    {
                        shape_props = _cur_shape_prop;
                    }
                    else
                    {
                        shape_props = CompareShapeProperties(shape_props, _cur_shape_prop);
                    }

                    var _cur_paragraph_para_pr = _current_object.getParagraphParaPr();
                    if(_cur_paragraph_para_pr != null)
                    {
                        if(para_props === null)
                        {
                            para_props = _cur_paragraph_para_pr;
                        }
                        else
                        {
                            para_props = para_props.Compare(_cur_paragraph_para_pr)
                        }
                    }
                    var _cur_paragraph_text_pr = _current_object.getParagraphTextPr();
                    if(_cur_paragraph_text_pr != null)
                    {
                        if(text_props === null)
                        {
                            text_props = _cur_paragraph_text_pr;
                        }
                        else
                        {
                            text_props = text_props.Compare(_cur_paragraph_text_pr)
                        }
                    }
                }

                var groups = by_types.groups;
                for(var i = 0; i < groups.length; ++i)
                {
                    var cur_group = groups[i];
                    var arr_by_types = cur_group.getArraysByTypes();
                    var images = cur_group.images;
                    for(var i = 0; i < images.length; ++i)
                    {
                        var _cur_image_prop = images[i].getImageProps();
                        if(_cur_image_prop !== null)
                        {
                            if(image_props === null)
                            {
                                image_props = _cur_image_prop;
                            }
                            else
                            {
                                image_props = CompareImageProperties(image_props, _cur_image_prop);
                            }
                        }
                    }
                    var shapes = cur_group.shapes;
                    for(var i = 0; i < shapes.length; ++i)
                    {
                        var _current_object = shapes[i];
                        var _cur_shape_prop =
                        {
                            type: _current_object.getPresetGeom(),
                            fill: _current_object.getFill(),
                            stroke: _current_object.getStroke(),
                            canChangeArrows: _current_object.canChangeArrows()
                        };

                        if(shape_props === null)
                        {
                            shape_props = _cur_shape_prop;
                        }
                        else
                        {
                            shape_props = CompareShapeProperties(shape_props, _cur_shape_prop);
                        }

                        var _cur_paragraph_para_pr = _current_object.getParagraphParaPr();
                        if(_cur_paragraph_para_pr != null)
                        {
                            if(para_props === null)
                            {
                                para_props = _cur_paragraph_para_pr;
                            }
                            else
                            {
                                para_props = para_props.Compare(_cur_paragraph_para_pr)
                            }
                        }
                        var _cur_paragraph_text_pr = _current_object.getParagraphTextPr();
                        if(_cur_paragraph_text_pr != null)
                        {
                            if(text_props === null)
                            {
                                text_props = _cur_paragraph_text_pr;
                            }
                            else
                            {
                                text_props = text_props.Compare(_cur_paragraph_text_pr)
                            }
                        }
                    }
                }
                break;
            }
            case STATES_ID_TEXT_ADD:
            case STATES_ID_TEXT_ADD_IN_GROUP:
            {
                this.State.textObject.updateInterfaceTextState();
                break;
            }
        }

        if(text_props != null)
        {
            if(text_props.Bold === undefined)
                text_props.Bold = false;
            if(text_props.Italic === undefined)
                text_props.Italic = false;
            if(text_props.Underline === undefined)
                text_props.Underline = false;
            if(text_props.Strikeout === undefined)
                text_props.Strikeout = false;
            if(text_props.FontFamily === undefined)
                text_props.FontFamily = {Index : 0, Name : ""};
            if(text_props.FontSize === undefined)
                text_props.FontSize = "";
            editor.UpdateTextPr(text_props);
        }
        else
        {
            //   editor.UpdateTextPr(_empty_text_pr);
        }

        return {textPr: text_props, paraPr: para_props, shapePr: shape_props, imagePr: image_props, chartPr: chart_props, tablePr: table_props};

    },

    getVerticalAlign: function()
    {
        switch(this.State.id)
        {
            case STATES_ID_TEXT_ADD:
            case STATES_ID_TEXT_ADD_IN_GROUP:
            {
                if(this.State.textObject && this.State.textObject)
                {
                    if(this.State.textObject.txBody && this.State.textObject.txBody.compiledBodyPr && typeof (this.State.textObject.txBody.compiledBodyPr.anchor) == "number")
                    {
                        return this.State.textObject.txBody.compiledBodyPr.anchor;
                    }
                }
                return null;
            }
            case STATES_ID_NULL:
            {
                var _result_align = null;
                var _cur_align;
                var _shapes = this.selectedObjects;
                var _shape_index;
                var _shape;
                for(_shape_index = 0; _shape_index < _shapes.length; ++_shape_index)
                {
                    _shape = _shapes[_shape_index];
                    if(_shape.selected)
                    {
                        if(_shape instanceof  CShape)
                        {
                            if(_shape.txBody && _shape.txBody.compiledBodyPr && typeof (_shape.txBody.compiledBodyPr.anchor) == "number")
                            {
                                _cur_align = _shape.txBody.compiledBodyPr.anchor;
                                if(_result_align === null)
                                {
                                    _result_align = _cur_align;
                                }
                                else
                                {
                                    if(_result_align !== _cur_align)
                                    {
                                        return null;
                                    }
                                }
                            }
                            else
                            {
                                return null;
                            }
                        }

                        if(_shape instanceof  CGroupShape)
                        {
                            _cur_align = _shape.calculateCompiledVerticalAlign();
                            if(_cur_align === null)
                            {
                                return null;
                            }
                            if(_result_align === null)
                            {
                                _result_align = _cur_align;
                            }
                            else
                            {
                                if(_result_align !== _cur_align)
                                {
                                    return null;
                                }
                            }
                        }
                    }
                }
                return _result_align;
            }
        }

        return null;
    },

    setVerticalAlign: function(align)
    {
        switch(this.State.id)
        {
            case STATES_ID_TEXT_ADD:
            case STATES_ID_TEXT_ADD_IN_GROUP:
            {
                if(this.State.textObject && this.State.textObject)
                {
                    this.State.textObject.setVerticalAlign(align);
                }
                return null;
            }
            case STATES_ID_NULL:
            {
                var _result_align = null;
                var _shapes = this.selectedObjects;
                var _shape_index;
                var _shape;
                for(_shape_index = 0; _shape_index < _shapes.length; ++_shape_index)
                {
                    _shape = _shapes[_shape_index];
                    if(_shape.selected)
                    {
                        if(typeof _shape.setVerticalAlign === "function")
                            _shape.setVerticalAlign(align);
                    }
                }
                return _result_align;
            }
        }

    },

    getChartObject: function()
    {
        var selected_arr = this.selectedObjects;
        for(var  i = 0;  i < selected_arr.length; ++i)
        {
            if(selected_arr[i].chart != null)
                return selected_arr[i];
        }

        var ret = new CChartAsGroup();
        var options = {};
        options.slide =  this.slide;
        options.layout = this.slide.Layout;
        options.master = this.slide.Layout.Master;
        options.theme = this.slide.Layout.Master.Theme;
        editor.chartStyleManager.init(options);
        ret.chart.initDefault();
        ret.spPr.xfrm.offX = 0;
        ret.spPr.xfrm.offY = 0;
        ret.spPr.xfrm.extX = this.slide.Width*2/3;//ditor.WordControl.m_oDrawingDocument.GetMMPerDot(c_oAscChartDefines.defaultChartWidth);
        ret.spPr.xfrm.extY = 0.593*this.slide.Height;//ditor.WordControl.m_oDrawingDocument.GetMMPerDot(c_oAscChartDefines.defaultChartHeight);
        return ret;
    },

    shapeApply: function(properties)
    {

        switch(this.State.id)
        {
            case STATES_ID_NULL:
            case STATES_ID_GROUP:
            case STATES_ID_TEXT_ADD:
            case STATES_ID_TEXT_ADD_IN_GROUP:
            {

                var selectedObjects = this.State.id === STATES_ID_NULL  || this.State.id === STATES_ID_TEXT_ADD ? this.selectedObjects : this.State.group.selectedObjects;
                for(var i = 0; i < selectedObjects.length; ++i)
                {

                    if(properties.type != undefined && properties.type != -1 && typeof selectedObjects[i].changePresetGeom === "function")
                    {
                        selectedObjects[i].changePresetGeom(properties.type);
                    }
                    if(properties.fill && typeof selectedObjects[i].changeFill === "function")
                    {
                        selectedObjects[i].changeFill(properties.fill);
                    }
                    if(properties.stroke && typeof selectedObjects[i].changeLine === "function")
                    {
                        selectedObjects[i].changeLine(properties.stroke);
                    }
                    if(properties.paddings && typeof selectedObjects[i].setPaddings === "function")
                    {
                        selectedObjects[i].setPaddings(properties.paddings);
                    }
                }
                if(typeof properties.verticalTextAlign === "number")
                {

                    if(this.State.id === STATES_ID_TEXT_ADD)
                    {
                        if(typeof this.State.textObject.setVerticalAlign === "function")
                            this.State.textObject.setVerticalAlign(properties.verticalTextAlign);
                    }

                    if(this.State.id === STATES_ID_TEXT_ADD_IN_GROUP)
                    {
                        if(typeof this.State.setVerticalAlign === "function")
                            this.State.textObject.setVerticalAlign(properties.verticalTextAlign);
                    }
                }
                if(this.State.id !==STATES_ID_GROUP && this.State.id !==STATES_ID_TEXT_ADD_IN_GROUP && isRealNumber(properties.w) && isRealNumber(properties.h))
                {
                    for(var i = 0; i < selectedObjects.length; ++i)
                    {

                        if(selectedObjects[i].setXfrm)
                        {
                            selectedObjects[i].setXfrm(null, null, properties.w, properties.h, null, null, null);
                        }
                    }
                }
                break;
            }
        }
        editor.WordControl.m_oLogicDocument.Recalculate();
    },

    imageApply: function(props)
    {

    },

    canGroup: function()
    {
        if(this.selectedObjects.length < 2)
            return false;
        for(var i = 0; i < this.selectedObjects.length; ++i)
        {
            if(typeof  this.selectedObjects[i].isTable === "function" && this.selectedObjects[i].isTable())
                return false;
            if(this.selectedObjects[i].isPlaceholder())
                return false;
        }
        return true;
    },

    canUnGroup: function()
    {
        for(var i = 0; i < this.selectedObjects.length; ++i)
        {
            if(this.selectedObjects[i].isGroup())
                return true;
        }
        return false;
    },

    Add_FlowImage: function(W, H, Img)
    {
        var image = new CImageShape(this.slide);
        image.blipFill = new CUniFill();
        image.blipFill.fill = new CBlipFill();
        image.blipFill.fill.RasterImageId = Img;
        image.spPr.geometry = CreateGeometry("rect");
        image.spPr.geometry.Init(5, 5);
        image.spPr.xfrm.offX = (this.slide.presentation.Width - W)/2;
        image.spPr.xfrm.offY = (this.slide.presentation.Height - H)/2;
        image.spPr.xfrm.extX = W;
        image.spPr.xfrm.extY = H;
        this.slide.addSp(image);
        editor.WordControl.m_oLogicDocument.recalcMap[image.Id] = image;
    },

    addChart: function(binary)
    {
        var chart = new CChartAsGroup(this.slide);
        chart.initFromBinary(binary);
        this.slide.addSp(chart);
        editor.WordControl.m_oLogicDocument.recalcMap[chart.Id] = chart;

    },

    editChart: function(binary)
    {
        switch(this.State.id)
        {
            case STATES_ID_GROUP:
            {
                break;
            }
            case STATES_ID_NULL:
            {
                if(this.selectedObjects.length === 1 && this.selectedObjects[0].chart)
                {
                    this.selectedObjects[0].initFromBinary(binary);
                    editor.WordControl.m_oLogicDocument.recalcMap[this.selectedObjects[0].Id] = this.selectedObjects[0];
                }
                break;
            }
        }
    },

    addNewParagraph: function(bRecalc)
    {
        switch (this.State.id)
        {
            case STATES_ID_TEXT_ADD:
            case STATES_ID_TEXT_ADD_IN_GROUP:
            {
                if(editor.WordControl.m_oLogicDocument.Document_Is_SelectionLocked(changestype_Drawing_Props) === false)
                {
                    this.State.textObject.addNewParagraph(bRecalc);
                    //this.State.textObject.recalculate();
                    //this.updateSelectionState();
                }
                break;
            }
        }
    },

    Cursor_MoveLeft : function(AddToSelect, Word)
    {
        switch (this.State.id)
        {
            case STATES_ID_TEXT_ADD:
            case STATES_ID_TEXT_ADD_IN_GROUP:
            {
                this.State.textObject.Cursor_MoveLeft(AddToSelect, Word);
                break;
            }
        }
    },

    Cursor_MoveRight : function(AddToSelect, Word)
    {
        switch (this.State.id)
        {
            case STATES_ID_TEXT_ADD:
            case STATES_ID_TEXT_ADD_IN_GROUP:
            {
                this.State.textObject.Cursor_MoveRight(AddToSelect, Word);
                break;
            }
        }
    },

    Cursor_MoveUp : function(AddToSelect)
    {
        switch (this.State.id)
        {
            case STATES_ID_TEXT_ADD:
            case STATES_ID_TEXT_ADD_IN_GROUP:
            {
                this.State.textObject.Cursor_MoveUp(AddToSelect);
                break;
            }
        }
    },

    Cursor_MoveDown : function(AddToSelect)
    {
        switch (this.State.id)
        {
            case STATES_ID_TEXT_ADD:
            case STATES_ID_TEXT_ADD_IN_GROUP:
            {
                this.State.textObject.Cursor_MoveDown(AddToSelect);
                break;
            }
        }
    },

    Cursor_MoveEndOfLine : function(AddToSelect)
    {
        switch (this.State.id)
        {
            case STATES_ID_TEXT_ADD:
            case STATES_ID_TEXT_ADD_IN_GROUP:
            {
                this.State.textObject.Cursor_MoveDown(AddToSelect);
                break;
            }
        }
    },

    Cursor_MoveStartOfLine : function(AddToSelect)
    {
        switch (this.State.id)
        {
            case STATES_ID_TEXT_ADD:
            case STATES_ID_TEXT_ADD_IN_GROUP:
            {
                this.State.textObject.Cursor_MoveDown(AddToSelect);
                break;
            }
        }
    },

    Cursor_MoveAt : function( X, Y, AddToSelect )
    {
        switch (this.State.id)
        {
            case STATES_ID_TEXT_ADD:
            case STATES_ID_TEXT_ADD_IN_GROUP:
            {
                this.State.textObject.Cursor_MoveAt(X, Y, AddToSelect );
                break;
            }
        }
    },

    Cursor_MoveToCell : function(bNext)
    {

    },


    remove: function(Count, bOnlyText, bRemoveOnlySelection)
    {
        switch (this.State.id)
        {
            case STATES_ID_TEXT_ADD:
            case STATES_ID_TEXT_ADD_IN_GROUP:
            {
                if(editor.WordControl.m_oLogicDocument.Document_Is_SelectionLocked(changestype_Drawing_Props) === false)
                {
                    this.State.textObject.remove(Count, bOnlyText, bRemoveOnlySelection);
                    this.State.textObject.recalculate();
                    this.updateSelectionState();
                }
                break;
            }
            case STATES_ID_NULL:
            {
                if(editor.WordControl.m_oLogicDocument.Document_Is_SelectionLocked(changestype_Drawing_Props) === false)
                {
                    this.slide.removeSelectedObjects();
                }
                break;
            }

        }
    },

    getSelectionState: function()
    {
        var s = {};
        switch(this.State.id)
        {
            case STATES_ID_TEXT_ADD:
            {
                s.id = STATES_ID_TEXT_ADD;
                s.textObject = this.State.textObject;
                s.textSelectionState = this.State.textObject.getTextSelectionState();
                break;
            }
            case STATES_ID_TEXT_ADD_IN_GROUP:
            {
                s.id = STATES_ID_TEXT_ADD_IN_GROUP;
                s.group = this.State.group;
                s.textObject = this.State.textObject;
                s.textSelectionState = this.State.textObject.getTextSelectionState();
                break;
            }
            default :
            {
                s.id = STATES_ID_NULL;
                s.selectedObjects = [];
                for(var i = 0; i < this.selectedObjects.length; ++i)
                {
                    s.selectedObjects.push(this.selectedObjects[i]);
                }
                break;
            }
        }
        return s;
    },

    setSelectionState: function(s)
    {
        this.resetSelectionState();
        switch(s.id)
        {
            case STATES_ID_TEXT_ADD:
            {
                s.textObject.select(this);
                s.textObject.setTextSelectionState(s.textSelectionState);
                this.changeCurrentState(new TextAddState(this, this.slide, s.textObject));
                break;
            }
            case STATES_ID_TEXT_ADD_IN_GROUP:
            {
                s.group.select(this);
                s.textObject.select(s.group);
                s.textObject.setTextSelectionState(s.textSelectionState);
                this.changeCurrentState(new TextAddInGroup(this, this.slide, s.group, s.textObject));

                break;
            }
            default :
            {
                for(var i = 0; i < s.selectedObjects.length; ++i)
                {
                    s.selectedObjects[i].select(this);
                }
                break;
            }
        }
        this.updateSelectionState()
    },

    recalculateCurPos: function()
    {
        if(isRealObject(this.State.textObject))
        {
            this.State.textObject.recalculateCurPos();
        }
    },


    onMouseDown: function(e, x, y)
    {
        this.State.onMouseDown(e, x, y);
        editor.asc_fireCallback("asc_onCanGroup", this.canGroup());
        editor.asc_fireCallback("asc_onCanUnGroup", this.canUnGroup());
    },

    onMouseDown2: function(e, x, y)
    {
        this.State.onMouseDown(e, x, y);
    },

    onMouseMove: function(e, x, y)
    {
        this.State.onMouseMove(e, x, y);
    },

    onMouseUp: function(e, x, y)
    {
        this.State.onMouseUp(e, x, y);
    },


    onMouseUp2: function(e, x, y)
    {
        this.State.onMouseUp(e, x, y);
        this.slide.presentation.Document_UpdateInterfaceState();
       /* if(this.State.id === STATES_ID_NULL)
        { */
            if(this.selectedObjects.length > 0)
            {
                var _data = new CContextMenuData();
                _data.Type = c_oAscContextMenuTypes.Main;
                _data.X_abs = e.X;
                _data.Y_abs = e.Y;
                editor.sync_ContextMenuCallback(_data);
            }
        //}
    },

    updateCursorType: function(e, x, y)
    {
        this.State.updateCursorType(e, x, y);
    },


    updateSelectionState: function()
    {
        if(isRealObject(this.State.textObject))
        {
            this.State.textObject.updateSelectionState();
        }
        else
        {
            this.slide.presentation.DrawingDocument.UpdateTargetTransform(null);
            this.slide.presentation.DrawingDocument.TargetEnd();
            this.slide.presentation.DrawingDocument.SelectEnabled(false);
            this.slide.presentation.DrawingDocument.SelectClear();
            this.slide.presentation.DrawingDocument.SelectShow();
        }

    },

    changeCurrentState: function(newState)
    {
        this.State = newState;
    },
    clearPreTrackObjects: function()
    {
        this.arrPreTrackObjects.length = 0;
    },

    addPreTrackObject: function(preTrackObject)
    {
        this.arrPreTrackObjects.push(preTrackObject);
    },

    clearTrackObjects: function()
    {
        this.arrTrackObjects.length = 0;
    },

    addTrackObject: function(trackObject)
    {
        this.arrTrackObjects.push(trackObject);
    },

    swapTrackObjects: function()
    {
        this.clearTrackObjects();
        for(var i = 0; i < this.arrPreTrackObjects.length; ++i)
            this.addTrackObject(this.arrPreTrackObjects[i]);
        this.clearPreTrackObjects();
    },

    getTrackObjects: function()
    {
        return this.arrTrackObjects;
    },

    rotateTrackObjects: function(angle, e)
    {
        for(var i = 0; i < this.arrTrackObjects.length; ++i)
            this.arrTrackObjects[i].track(angle, e);
    },

    trackNewShape: function(e, x, y)
    {
        this.arrTrackObjects[0].track(e, x, y);
    },

    trackMoveObjects: function(dx, dy)
    {
        for(var i = 0; i < this.arrTrackObjects.length; ++i)
            this.arrTrackObjects[i].track(dx, dy);
    },

    trackAdjObject: function(x, y)
    {
        if(this.arrTrackObjects.length > 0)
            this.arrTrackObjects[0].track(x, y);
    },

    trackResizeObjects: function(kd1, kd2, e)
    {
        for(var i = 0; i < this.arrTrackObjects.length; ++i)
            this.arrTrackObjects[i].track(kd1, kd2, e);
    },

    trackEnd: function()
    {
        for(var i = 0; i < this.arrTrackObjects.length; ++i)
            this.arrTrackObjects[i].trackEnd();
    },


    drawSelect: function(drawingDocument)
    {
        this.State.drawSelection(drawingDocument)
    },


    DrawOnOverlay: function(overlay)
    {
        for(var i = 0; i < this.arrTrackObjects.length; ++i)
            this.arrTrackObjects[i].draw(overlay);
    },

    drawTracks: function(overlay)
    {},



    hitToBoundsRect: function(x, y)
    {
        return false;
    }
};

function isRealObject(object)
{
    return object !== null && typeof object === "object" ;
}

function isRealNumber(number)
{
    return typeof number === "number" && !isNaN(number);
}

function isRealBool(bool)
{
    return bool === true || bool === false;
}