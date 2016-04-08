"use strict";
/**
 * User: Ilja.Kirillov
 * Date: 06.04.2016
 * Time: 14:15
 */

(function(window, builder)
{
    var Api = window["asc_docs_api"];

    function ApiDocument(Document)
    {
        this.Document = Document;
    }

    function ApiParagraph(Paragraph)
    {
        this.Paragraph = Paragraph;
    }

    function ApiTable(Table)
    {
        this.Table = Table;
    }

    function ApiRun(Run)
    {
        this.Run = Run;
    }

    function ApiStyle(Style)
    {
        this.Style = Style;
    }

    function ApiSection(Section)
    {
        this.Section = Section;
    }

    //------------------------------------------------------------------------------------------------------------------
    //
    // Base Api
    //
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Get main document
     * @returns {ApiDocument}
     */
    Api.prototype["GetDocument"] = function()
    {
        return new ApiDocument(this.WordControl.m_oLogicDocument);
    };
    /**
     * Create new paragraph
     * @returns {ApiParagraph}
     */
    Api.prototype["CreateParagraph"] = function()
    {
        return new ApiParagraph(new Paragraph(private_GetDrawingDocument(), private_GetLogicDocument()));
    };
    /**
     * Create new table
     * @param nCols
     * @param nRows
     * @returns {ApiTable}
     */
    Api.prototype["CreateTable"] = function(nCols, nRows)
    {
        if (!nRows || nRows <= 0 || !nCols || nCols <= 0)
            return null;

        return new ApiTable(new CTable(private_GetDrawingDocument(), private_GetLogicDocument(), true, 0, 0, 0, 0, 0, nRows, nCols, [], false));
    };

    //------------------------------------------------------------------------------------------------------------------
    //
    // ApiDocument
    //
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Get elements count
     */
    ApiDocument.prototype["GetElementsCount"] = function()
    {
        return this.Document.Content.length;
    };
    /**
     * Get element by position
     * @returns {ApiParagraph | ApiTable | null}
     */
    ApiDocument.prototype["GetElement"] = function(nPos)
    {
        if (!this.Document.Content[nPos])
            return null;

        return this.Document.Content[nPos];
    };
    /**
     * Add paragraph or table by position
     * @param nPos
     * @param oElement (ApiParagraph | ApiTable)
     */
    ApiDocument.prototype["AddElement"] = function(nPos, oElement)
    {
        if (oElement instanceof ApiParagraph || oElement instanceof ApiTable)
        {
            this.Document.Internal_Content_Add(nPos, oElement.private_GetImpl());
            return true;
        }

        return false;
    };
    /**
     * Push paragraph or table
     * @param oElement (ApiParagraph | ApiTable)
     */
    ApiDocument.prototype["Push"] = function(oElement)
    {
        if (oElement instanceof ApiParagraph || oElement instanceof ApiTable)
        {
            this.Document.Internal_Content_Add(this.Document.Content.length, oElement.private_GetImpl(), true);
            return true;
        }

        return false;
    };
    /**
     * Get style by style name
     * @param sStyleName
     * @returns {ApiStyle | null}
     */
    ApiDocument.prototype["GetStyle"] = function(sStyleName)
    {
        var oStyles = this.Document.Get_Styles();
        var oStyleId = oStyles.Get_StyleIdByName(sStyleName);
        return new ApiStyle(oStyles.Get(oStyleId));
    };
    /**
     * Get document final section
     * @return {ApiSection}
     */
    ApiDocument.prototype["GetFinalSection"] = function()
    {
        return new ApiSection(this.Document.SectPr);
    };
    /**
     * Create a new section of the document, which ends at the specified paragraph.
     * @param oParagraph (ApiParagraph)
     * @returns {ApiSection}
     * @constructor
     */
    ApiDocument.prototype["CreateSection"] = function(oParagraph)
    {
        if (!(oParagraph instanceof ApiParagraph))
            return;

        var oSectPr = new CSectionPr(this.Document);
        oParagraph.private_GetImpl().Set_SectionPr(oSectPr);
        return new ApiSection(oSectPr);
    };

    //------------------------------------------------------------------------------------------------------------------
    //
    // ApiParagraph
    //
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Add text
     * @param sText
     * @returns {ApiRun}
     */
    ApiParagraph.prototype["AddText"] = function(sText)
    {
        var oRun = new ParaRun(this.Paragraph, false);

        if (!sText || !sText.length)
            return oRun;

        for (var nPos = 0, nCount = sText.length; nPos < nCount; ++nPos)
        {
            var nChar = sText.charAt(nPos);
            if (" " == nChar)
                oRun.Add_ToContent(nPos, new ParaSpace(), false);
            else
                oRun.Add_ToContent(nPos, new ParaText(nChar), false);
        }

        private_PushElementToParagraph(this.Paragraph, oRun);
        return new ApiRun(oRun);
    };
    /**
     * Add page beak
     * @returns {ApiRun}
     */
    ApiParagraph.prototype["AddPageBreak"] = function()
    {
        var oRun = new ParaRun(this.Paragraph, false);
        oRun.Add_ToContent(0, new ParaNewLine(break_Page));
        private_PushElementToParagraph(this.Paragraph, oRun);
        return new ApiRun(oRun);
    };
    /**
     * Add line break
     * @returns {ApiRun}
     */
    ApiParagraph.prototype["AddLineBreak"] = function()
    {
        var oRun = new ParaRun(this.Paragraph, false);
        oRun.Add_ToContent(0, new ParaNewLine(break_Line));
        private_PushElementToParagraph(this.Paragraph, oRun);
        return new ApiRun(oRun);
    };
    /**
     * Add column break
     * @returns {ApiRun}
     */
    ApiParagraph.prototype["AddColumnBreak"] = function()
    {
        var oRun = new ParaRun(this.Paragraph, false);
        oRun.Add_ToContent(0, new ParaNewLine(break_Column));
        private_PushElementToParagraph(this.Paragraph, oRun);
        return new ApiRun(oRun);
    };
    /**
     * Get ApiRun with paragraph mark
     * @returns {ApiRun}
     */
    ApiParagraph.prototype["GetParagraphMark"] = function()
    {
        var oEndRun = this.Paragraph.Content[this.Paragraph.Content.length - 1];
        return new ApiRun(oEndRun);
    };
    /**
     * Set paragraph style
     * @param oStyle (ApiStyle)
     * @returns {boolean}
     */
    ApiParagraph.prototype["SetStyle"] = function(oStyle)
    {
        if (!oStyle || !(oStyle instanceof ApiStyle))
            return false;

        this.Paragraph.Style_Add(oStyle.Style.Get_Id(), true);
        return true;
    };
    /**
     * Set paragraph line spacing. If the value of the <sLineRule> parameter is either "atLeast" or "exact", then the
     * value of <nLine> shall be interpreted as twentieths of a point. If the value of the <sLineRule> parameter is
     * "auto", then the value of the <nLine> attribute shall be interpreted as 240ths of a line.
     * @param nLine (twips | 1/240ths of a line)
     * @param sLineRule ("auto" | "atLeast" | "exact")
     */
    ApiParagraph.prototype["SetSpacingLine"] = function(nLine, sLineRule)
    {
        this.Paragraph.Set_Spacing(private_GetParaSpacing(nLine, sLineRule, undefined, undefined, undefined, undefined), false);
    };
    /**
     * Set paragraph spacing before. If the value of the <isBeforeAuto> parameter is <true>, then any value of the
     * <nBefore> is ignored. If <isBeforeAuto> parameter is not specified, then it will be interpreted as <false>.
     * @param nBefore (twips)
     * @param isBeforeAuto  (true | false)
     */
    ApiParagraph.prototype["SetSpacingBefore"] = function(nBefore, isBeforeAuto)
    {
        this.Paragraph.Set_Spacing(private_GetParaSpacing(undefined, undefined, nBefore, undefined, isBeforeAuto === undefined ? false : isBeforeAuto, undefined), false);
    };
    /**
     * Set paragraph spacing after. If the value of the <isAfterAuto> parameter is <true>, then any value of the
     * <nAfter> is ignored. If <isAfterAuto> parameter is not specified, then it will be interpreted as <false>.
     * @param nAfter (twips)
     * @param isAfterAuto  (true | false)
     */
    ApiParagraph.prototype["SetSpacingAfter"] = function(nAfter, isAfterAuto)
    {
        this.Paragraph.Set_Spacing(private_GetParaSpacing(undefined, undefined, undefined, nAfter, undefined, isAfterAuto === undefined ? false : isAfterAuto), false);
    };
    /**
     * Set paragraph justification
     * @param sJc ("left" | "right" | "both" | "center")
     */
    ApiParagraph.prototype["SetJc"] = function(sJc)
    {
        var nAlign = private_GetParaAlign(sJc);
        if (undefined !== nAlign)
            this.Paragraph.Set_Align(nAlign);
    };
    /**
     * Set left indentation
     * @param nValue (twips)
     */
    ApiParagraph.prototype["SetIndLeft"] = function(nValue)
    {
        this.Paragraph.Set_Ind(private_GetParaInd(nValue, undefined, undefined));
    };
    /**
     * Set right indentation
     * @param nValue (twips)
     */
    ApiParagraph.prototype["SetIndRight"] = function(nValue)
    {
        this.Paragraph.Set_Ind(private_GetParaInd(undefined, nValue, undefined));
    };
    /**
     * Set first line indentation
     * @param nValue (twips)
     */
    ApiParagraph.prototype["SetIndFirstLine"] = function(nValue)
    {
        this.Paragraph.Set_Ind(private_GetParaInd(undefined, undefined, nValue));
    };
    
    //------------------------------------------------------------------------------------------------------------------
    //
    // ApiRun
    //
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Set bold
     * @param isBold (true | false)
     */
    ApiRun.prototype["SetBold"] = function(isBold)
    {
        this.Run.Set_Bold(isBold);
    };
    /**
     * Set italic
     * @param isItalic (true | false)
     */
    ApiRun.prototype["SetItalic"] = function(isItalic)
    {
        this.Run.Set_Italic(isItalic);
    };

    /**
     * Set underline
     * @param isUnderline (true | false)
     */
    ApiRun.prototype["SetUnderline"] = function(isUnderline)
    {
        this.Run.Set_Underline(isUnderline);
    };
    /**
     * Set font size
     * @param nSize (half-points)
     */
    ApiRun.prototype["SetFontSize"] = function(nSize)
    {
        this.Run.Set_FontSize(private_GetHps(nSize));
    };
    /**
     * Set text color in rgb
     * @param r (0-255)
     * @param g (0-255)
     * @param b (0-255)
     * @param isAuto (true | false) false is default
     */
    ApiRun.prototype["SetColor"] = function(r, g, b, isAuto)
    {
        this.Run.Set_Color(private_GetColor(r, g, b, isAuto));
    };
    /**
     * Set text spacing
     * @param nSpacing (twips)
     */
    ApiRun.prototype["SetSpacing"] = function(nSpacing)
    {
        this.Run.Set_Spacing(private_Twips2MM(nSpacing));
    };

    //------------------------------------------------------------------------------------------------------------------
    //
    // ApiSection
    //
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Specify the section type of the current section. The section type specifies how the contents of the current
     * section shall be placed relative to the previous section.
     * WordprocessingML supports five distinct types of section breaks:
     *   <b>Next page</b> section breaks (the default if type is not specified), which begin the new section on the
     *   following page.
     *   <b>Odd</b> page section breaks, which begin the new section on the next odd-numbered page.
     *   <b>Even</b> page section breaks, which begin the new section on the next even-numbered page.
     *   <b>Continuous</b> section breaks, which begin the new section on the following paragraph. This means that
     *   continuous section breaks might not specify certain page-level section properties, since they shall be
     *   inherited from the following section. These breaks, however, can specify other section properties, such
     *   as line numbering and footnote/endnote settings.
     *   <b>Column</b> section breaks, which begin the new section on the next column on the page.
     * @param sType ("nextPage" | "oddPage" | "evenPage" | "continuous" | "nextColumn")
     */
    ApiSection.prototype["SetType"] = function(sType)
    {
        if ("oddPage" === sType)
            this.Section.Set_Type(section_type_OddPage);
        else if ("evenPage" === sType)
            this.Section.Set_Type(section_type_EvenPage);
        else if ("continuous" === sType)
            this.Section.Set_Type(section_type_Continuous);
        else if ("nextColumn" === sType)
            this.Section.Set_Type(section_type_Column);
        else if ("nextPage" === sType)
            this.Section.Set_Type(section_type_NextPage);
    };
    /**
     * Specify all text columns in the current section are of equal width.
     * @param nCount
     * @param nSpace (twips)
     */
    ApiSection.prototype["SetEqualColumns"] = function(nCount, nSpace)
    {
        this.Section.Set_Columns_EqualWidth(true);
        this.Section.Set_Columns_Num(nCount);
        this.Section.Set_Columns_Space(private_Twips2MM(nSpace));
    };
    /**
     * Set all columns of this section are of different widths. Count of columns are equal length of <aWidth> array.
     * The length of <aSpaces> array MUST BE (<aWidth>.length - 1).
     * @param aWidths (array of twips)
     * @param aSpaces (array of twips)
     */
    ApiSection.prototype["SetNotEqualColumns"] = function(aWidths, aSpaces)
    {
        if (!aWidths || !aWidths.length || aWidths.length <= 1 || aSpaces.length !== aWidths.length - 1)
            return false;

        this.Section.Set_Columns_EqualWidth(false);
        var aCols = [];
        for (var nPos = 0, nCount = aWidths.length; nPos < nCount; ++nPos)
        {
            var SectionColumn = new CSectionColumn();
            SectionColumn.W     = private_Twips2MM(aWidths[nPos]);
            SectionColumn.Space = private_Twips2MM(nPos !== nCount - 1 ? aSpaces[nPos] : 0);
            aCols.push(SectionColumn);
        }

        this.Section.Set_Columns_Cols(aCols);
        this.Section.Set_Columns_Num(aCols.length);
    };
    /**
     * Specify the properties (size and orientation) for all pages in the current section.
     * @param nWidth (twips)
     * @param nHeight (twips)
     * @param isPortrait (true | false) Specifies the orientation of all pages in this section. Default value is true.
     */
    ApiSection.prototype["SetPageSize"] = function(nWidth, nHeight, isPortrait)
    {
        this.Section.Set_PageSize(private_Twips2MM(nWidth), private_Twips2MM(nHeight));
        this.Section.Set_Orientation(false === isPortrait ? orientation_Landscape : orientation_Portrait, false);
    };
    /**
     * Specify the page margins for all pages in this section.
     * @param nLeft (twips)
     * @param nTop (twips)
     * @param nRight (twips)
     * @param nBottom (twips)
     */
    ApiSection.prototype["SetPageMargins"] = function(nLeft, nTop, nRight, nBottom)
    {
        this.Section.Set_PageMargins(private_Twips2MM(nLeft), private_Twips2MM(nTop), private_Twips2MM(nRight), private_Twips2MM(nBottom));
    };
    /**
     * Specifies the distance (in twentieths of a point) from the top edge of the page to the top edge of the header.
     * @param nDistance (twips)
     */
    ApiSection.prototype["SetHeaderDistance"] = function(nDistance)
    {
        this.Section.Set_PageMargins_Header(private_Twips2MM(nDistance));
    };
    /**
     * Specifies the distance (in twentieths of a point) from the bottom edge of the page to the bottom edge of the footer.
     * @param nDistance (twips)
     */
    ApiSection.prototype["SetFooterDistance"] = function(nDistance)
    {
        this.Section.Set_PageMargins_Footer(private_Twips2MM(nDistance));
    };


    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Private area
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    function private_GetDrawingDocument()
    {
        return editor.WordControl.m_oLogicDocument.DrawingDocument;
    }

    function private_PushElementToParagraph(oPara, oElement)
    {
        // Добавляем не в конец из-за рана с символом конца параграфа TODO: ParaEnd
        oPara.Add_ToContent(oPara.Content.length - 1, oElement);
    }

    function private_GetLogicDocument()
    {
        return editor.WordControl.m_oLogicDocument;
    }

    function private_Twips2MM(twips)
    {
        return 25.4 / 72.0 / 20 * twips;
    }

    function private_GetHps(hps)
    {
        return 2 * Math.ceil(hps);
    }

    function private_GetColor(r, g, b, Auto)
    {
        return new CDocumentColor(r, g, b, Auto ? Auto : false);
    }

    function private_GetParaSpacing(nLine, sLineRule, nBefore, nAfter, isBeforeAuto, isAfterAuto)
    {
        var oSp = new CParaSpacing();

        if (undefined !== nLine && undefined !== sLineRule)
        {
            if ("auto" === sLineRule)
            {
                oSp.LineRule = linerule_Auto;
                oSp.Line = nLine / 240.0;
            }
            else if ("atLeast" === sLineRule)
            {
                oSp.LineRule = linerule_AtLeast;
                oSp.Line = private_Twips2MM(nLine);

            }
            else if ("exact" === sLineRule)
            {
                oSp.LineRule = linerule_Exact;
                oSp.Line = private_Twips2MM(nLine);
            }
        }

        if (undefined !== nBefore)
            oSp.Before = private_Twips2MM(nBefore);

        if (undefined !== nAfter)
            oSp.After = private_Twips2MM(nAfter);

        if (undefined !== isAfterAuto)
            oSp.AfterAutoSpacing = isAfterAuto;

        if (undefined !== isBeforeAuto)
            oSp.BeforeAutoSpacing = isBeforeAuto;

        return oSp;
    }

    function private_GetParaInd(nLeft, nRight, nFirstLine)
    {
        var oInd = new CParaInd();

        if (undefined !== nLeft)
            oInd.Left = private_Twips2MM(nLeft);

        if (undefined !== nRight)
            oInd.Right = private_Twips2MM(nRight);

        if (undefined !== nFirstLine)
            oInd.FirstLine = private_Twips2MM(nFirstLine);

        return oInd;
    }

    function private_GetParaAlign(sJc)
    {
        if ("left" === sJc)
            return align_Left;
        else if ("right" === sJc)
            return align_Right;
        else if ("both" === sJc)
            return align_Justify;
        else if ("center" === sJc)
            return align_Center;

        return undefined;
    }

    ApiParagraph.prototype.private_GetImpl = function()
    {
        return this.Paragraph;
    };
    ApiTable.prototype.private_GetImpl = function()
    {
        return this.Table;
    };

}(window, null));


function TEST_BUILDER()
{
    var oLD = editor.WordControl.m_oLogicDocument;
    oLD.Create_NewHistoryPoint();
    //------------------------------------------------------------------------------------------------------------------

    // Воссоздаем документ DemoHyden

    var Api = editor;

    var oDocument     = Api.GetDocument();
    var oHeadingStyle = oDocument.GetStyle("Heading 1");
    var oNoSpacingStyle = oDocument.GetStyle("No Spacing");
    var oFinalSection   = oDocument.GetFinalSection();
    oFinalSection.SetEqualColumns(2, 720);
    oFinalSection.SetPageSize(12240, 15840);
    oFinalSection.SetPageMargins(1440, 1440, 1440, 1440);
    oFinalSection.SetHeaderDistance(720);
    oFinalSection.SetFooterDistance(720);
    oFinalSection.SetType("continuous");

    var oParagraph = Api.CreateParagraph();
    oParagraph.SetSpacingLine(276, "auto");
    oParagraph.SetJc("left");
    var oEndRun = oParagraph.GetParagraphMark();
    oEndRun.SetFontSize(52);
    oEndRun.SetColor(0x14, 0x14, 0x14);
    oEndRun.SetSpacing(5);
    oParagraph.AddPageBreak();
    // TODO: Добавить 2 автофигуры
    oDocument.Push(oParagraph);


    oParagraph = Api.CreateParagraph();
    oParagraph.SetStyle(oNoSpacingStyle);
    // TODO: Добавить aвтофигуру
    oDocument.Push(oParagraph);


    oParagraph = Api.CreateParagraph();
    oParagraph.SetStyle(oHeadingStyle);
    // TODO: Добавить aвтофигуру
    oParagraph.AddText("Overview");
    oDocument.Push(oParagraph);


    oParagraph = Api.CreateParagraph();
    oParagraph.AddText("In the previous meeting of the board of directors funds were approved to take the product “Innovate 1” to market.  They have also allocated a sum of $250,000  towards market identification and launch efforts. This document describes in brief the objective set forth by the VP of marketing pursuant to the board’s decision.");
    oDocument.Push(oParagraph);

    oParagraph = Api.CreateParagraph();
    oDocument.Push(oParagraph);

    oParagraph = Api.CreateParagraph();
    oParagraph.SetStyle(oHeadingStyle);
    oParagraph.SetSpacingAfter(100, true);
    oParagraph.SetSpacingBefore(100, true);
    // TODO: Добавить aвтофигуру
    oParagraph.AddText("Summary");
    oDocument.Push(oParagraph);


    oParagraph = Api.CreateParagraph();
    oParagraph.SetSpacingAfter(100, true);
    oParagraph.SetSpacingBefore(100, true);
    // TODO: Добавить автофигуру
    oParagraph.AddText("After years of market research and focused creative effort we are in a position to take our “Innovate 1” to market. We have a three phase approach in place to complete the product and take the product to market.  The first step of this initiative is to test the market.  Once we have identified the market, then we will make any final product product to drive that effectively keeps down costs while meeting sales goals. ");
    oDocument.Push(oParagraph);


    oParagraph = Api.CreateParagraph();
    oDocument.Push(oParagraph);


    oParagraph = Api.CreateParagraph();
    oParagraph.SetStyle(oHeadingStyle);
    oParagraph.SetSpacingAfter(100, true);
    oParagraph.SetSpacingBefore(100, true);
    // TODO: Добавить автофигуру
    oParagraph.AddText("Financial Overview");
    oDocument.Push(oParagraph);


    oParagraph = Api.CreateParagraph();
    oParagraph.SetIndRight(5040);
    oParagraph.AddText("Included are the estimated investment costs to introduce the new product.  As you can see for the first 3 years we will be in the investment phase.  Generating market demand and building our reputation in this category.  By 201");
    oParagraph.AddText("7");
    oParagraph.AddText(" we expect to be profitable.");
    oDocument.Push(oParagraph);


    oParagraph = Api.CreateParagraph();
    oParagraph.SetIndRight(5040);
    oDocument.Push(oParagraph);


    oParagraph = Api.CreateParagraph();
    oParagraph.SetStyle(oHeadingStyle);
    oParagraph.SetSpacingAfter(100, true);
    oParagraph.SetSpacingBefore(100, true);
    oParagraph.AddText("Details");
    oDocument.Push(oParagraph);


    oParagraph = Api.CreateParagraph();
    oParagraph.SetSpacingAfter(240);
    oParagraph.AddText("Out of the $250,000 allocated for this effort, we would like to spend about $50,000 towards the identification of the market.  For this we are allowed to engage with a marketing consulting organization.  Let us start with creating an RFP for this and start inviting the bids.   We would like to get the selection process completed by no later than end of first quarter.");
    oDocument.Push(oParagraph);


    oParagraph = Api.CreateParagraph();
    oParagraph.SetSpacingBefore(100, true);
    oParagraph.SetSpacingAfter(360);
    oDocument.Push(oParagraph);
    var oSection1 = oDocument.CreateSection(oParagraph);
    oSection1.SetEqualColumns(1, 720);
    oSection1.SetPageSize(12240, 15840);
    oSection1.SetPageMargins(1440, 1440, 1440, 1440);
    oSection1.SetHeaderDistance(720);
    oSection1.SetFooterDistance(576);


    //------------------------------------------------------------------------------------------------------------------
    oLD.Recalculate_FromStart(true);
}
