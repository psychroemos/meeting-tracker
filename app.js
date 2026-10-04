        const ASSIGNMENT_TYPES = [
            'Opening Prayer',
            'OCLM Chairman',
            '10 mins talk',
            'Espiritual na Hiyas',
            'Auxiliary Class Chairman',
            'Pamumuhay',
            'CBS',
            'CBS Reader',
            'Closing prayer'
        ];

        // Names to highlight and show at the bottom of the assignments grid

        // Names with blue highlight in assignments grid

        // Names with green highlight in assignments grid (at the very bottom)

        const BROTHER_CATEGORIES = ['Elder', 'MS', 'Brother'];

        function normalizeBrotherName(name) {
            return (name || '').toLowerCase().trim().replace(/\s+/g, ' ');
        }

        function getBrotherCategory(brother) {
            if (!brother) return 'Elder';
            return brother.category || 'Elder';
        }

        function getBrotherRowClass(brother, rowIdx) {
            const category = getBrotherCategory(brother);
            if (category === 'MS') return 'row-highlight';
            if (category === 'Brother') return 'row-blue';
            return rowIdx % 2 === 0 ? '' : 'row-even';
        }

        let brothers = [];
        let assignments = [];
        let sundayAssignments = [];
        let brotherEligibility = {};
        let currentView = 'grid';
        let undoStack = [];
        let selectedDate = null;
        let selectedType = null;
        let autoAssignPreview = null;
        let autoAssignUnfilled = 0;
        let workbookPreview = null;
        let meetingEditorData = {}; // Stores editable fields for PDF editor
        let gridStartMonth = 1; // 1-12, the first month shown in the grid
        const GRID_MONTH_COUNT = 6; // number of months visible at once
        const AUXILIARY_START_MONTH = 7; // 1-indexed month (7 = July) when Auxiliary Class begins
        const ICON_B64 = {
            diamond: 'data:image/png;base64,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',
            grain: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFMAAABTCAYAAADjsjsAAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAtFSURBVHhe7Zt7bFRVHoC/e+fRTjtDp69pSx+01AXSSg3UYqXoCiICQuiS3fDYzQpLMMgfBDcxqBhjouCDRA1L0IS4m+yGR4SYGpAiFEWpaIQCirBqgZbS0nb6oI+ZTmc6c+/+MdPb3hnq6mZ6Z9jM908795wz03455/7O73fPCFfeRiZGWBCDL8T434nJDCMxmWEkJjOMxGSGkZjMMBKTGUZiMsNITGYYickMIzGZYSQmM4zEZIaRmMwwEvUyTVnlpM/ehimrPLgp6ohqmaLRQubc3aTNeoHMubsRjZbgLlFFVMs0ZZShT7ABoE+wYcooC+4SVUSVzPTZrzBlQxe5ldVjzkLRaCG3spopG7pIn/1KcHNEiSqZpqwH0cWnEJ82fcxZaMooIz5tOrr4FExZDwY3R5Soknm3o7lMU0YZE6atJi6lKLgpLMSlFDFh6spxe/+fQ1OZotFC1oJ/kL1wL5NW1JI260VVu6v1K3yD3Qx2XsLVflbVNoyr/SyDnZfwDXbjav1K1ZY260Umragle9F+sp/4YMz77nghaPmoNzF3HhMf/yd6c3bgisyg/QL2L1/AeeOToN7q/l5HC7c++TPOm58GdyNx0uPYKrYTb5sBCAA/23+80HRmhiIQb5tJ7tIqsubvCZlJrvazeAfsAHgH7CGzVTRayJq/h9ylVcTbZioiI0XEZHodLXh6rwEygj4e673rKPjjBazF65Q+kqefts820vnNdto+24jk6VfarMWB/veuQ9DHAzKe3mt4HS1KH62JmEyfp5eGvTPovrgLyd0LCBiTCsl89D1yK49iMOcA4Gr9mo4zW3G1fg2AwZxDbuVRMh99D2NSISAguXvpvriLhr0z8Hl6gz5JOzSVKXn6kaUh1ev2U5toqlqIs6kGWfIiiHrM+QvJWXYkJCLHpRSRs+wI5vyFCKIeWfLibKqhqWoh7ac2qWauLA2pXmuBpjJd7WeRvAMACKIRY/IU//XWr2n68DHaTm5gyNHsv5eml2Cb87pqvG3O68SnlwACQ45m2k5uoOnDx5RZa0yegiAaAZC8AyH32PFGU5kAnp6rABgseViL1qjaei6/T1vNUyNCMx/APHkpAObJS4nPfGBEZM1T9Fx+XzXeWrQGgyUPRn2Olmgu03H9CD53D4LOSMqMzWTO3aWK4o7GahzXj4AsoYuzKmmlKaMMXZwVZAnH9SM4GquVMf7q0i5SZmxG0BnxuXv876Exmsvs+X4P/fWHkH0eBL2J5Ps2hkRxn6sDWfKCICLqEwD8PwURWfLic3UofYejevJ9GxH0JmSfh/76Q/R8v0fpoxWaywRorVlPV92OkCiet/yEqggsiHrEeCsAYrwVQdQrbaascvKWnwiJ6l11O2itWa/005KIyAToOPNiSBRPzJtPXuWxwAZ8bOJtM8mrPEZi3vyQqN5xRp2iaknEZDIqittrtyiZjhiXhLngCQSdPyoHI+iMmAueQIxLgkBmZK/doorqkUJzmZN+f4ppmzyqJd19/i0a95XS9+MBZO9g8JA7InsH6fvxAI37Suk+/xaMWvrTNnnI+11orj/eaCozIfshDNZCBNGgLOmMR3YiGi0MOZppqV5Fa816Jc2UfR68jlsAeB23kH0eJW1srVlPS/UqhhzNiEYLGY/sHLX0DRhTi0jIfij4TxhXIlw1IiDnOl3fvKbsG0WjhZQZzwDQfeFtJE//Ha8RiOaps57HmDRZVeiIRNUoYjJ97h4EBOXeJ3sH6b9Whf30s4FN+89jMOdge2gHlsLKQKEDJHcvMjK6OGtEZGq6zEfjdd6i+egKBu3nlcrRhKkryV9dR+r9W4K7q0i9fwv5q+uYMHWlUjEatJ+n+egKvE7/bSESaCpTloaQRy0E541PaNhXir32eSWa6xNs2Cq2kbPkUEh9UzRayFlyCFvFNuURsD+aP0/DvlJVgVlGVhVVtEBTmQMtp5E8fQAIiIqsrnNv0Hx4mbLnRNBhKazEVvGaaryt4jUshZUg6JS9ZfPhZXSdewMCsoXAvyR5+hhoOa0aP95oKhNAcvcAoLfkYi1aq1wf3nN2nNnqz4wEHeaCJcr2yZRVjrlgCQg6JHcvHWe2huwtrUVr0VtyYdTnaInmMp1NJ5F9HkRDIqllW1Q5OUDXuTdx3qyBwJJPyH4YgITsh5Wl7bxZQ9e5N1XjrMXrSC3bgmhIRPZ5cDadVLVrgeYyu+p2MNDyBSCjT5xI5rzdZC/ar1TWAdxdV/x7SkGHaDAD+H8KOmSfB3fXFaWvwZxD9qL9ZM7bjT5xIiAz0PIFXXU7lD5aoblMydNP6/G1OBqP+XNynXHMKC7ojOjNEwHQmyeGpJiqqK4zIkteHI3HaD2+VvMqO5GQCTDkaOZm1WLaT23C62yDwJJOn/0qectPIOhNwUNUCHoTectPkD771ZGo7myj/dQmblYt/kX71PEgIjKHuf3duzTuL1Ny8uHKkb/IawjuDoCgM5AyY/NIxWg4R99fxu3v3g3urimay8yc+zcK19STXv4yBGZpS/UqWqpX4ump92/gRb0qNVQjBNplPD31tFSvVHJ0gPTylylcU0/m3L8FDxx3NJVpyijDXLAEo/Ue0spfomB1HYmTHgeg/9pHNOwrHfXoF5AlpYokewdBliCQNnZf3EXDvlL6r30EgVMdBavrSCt/CaP1Hv+2aoyTdOOFpjJFowVBHF6+oac5Rj/6HWg5jbv7Co6GjwFwNHyMu/sKAy2nVY92xzrVIYiGkAxqvIlYoQPZB4IY+OdDK0e/hNCKkeyfvYLu/7/QMeRoRvK6APDcrsf+5dZATn7n0xxjcadTHd4BOx1fvYyntwEAyevSPKprKtNz+yd8Ln9BQ5dgY6jnqion95/mWET+qrMklzwdPByA5JKnyV91FnP+ItXzn+bDyxjsuIBonACAz2XHc/un4OHjiqYyAdyd3wMyonECpswHVKc5hivs+sRM0iu2k1yyQTU2uWQD6RXb0SdmBm4N11SnOhImVqCLTwZZYtB+QTVWCzSXOdj5LdKQE0HUk5A7TwkSPZffp+ngI/RfrQLZhy7OSnLJRuUIjTF5CsklGwMHEXz0X62i6eAjqup8Yt4CBNGAz9PLQOsZ1edqgeYye//9L9wd3wIQl1pMaumzStuQo5lbx58cOfGWNJnEvAUAJOYtwJA0GQIVplvHn1TdE1NLnyUutRgCs7/vh31Km1ZoLlPy9NP30wf+2akzklS8FnP+IlW7s/mU/8SHaFB9D0gQDf6KUPMpVe5tzl9EUvFaBJ0RachJf/0hpU1LNJcJ0H1xJwM3PwVk/7OcOa+rjw8GNueCzoA+IQMAfULGSIoZaCdQ57TNeSOwA5AZuPkp3Rd3Ku1aEhGZAPba53B3XgIgLm062UsOKtnQCAKIOv+voi4kxUya9ieyF+4lLm06AO7OS9hrn1P10ZKIyXR3X8Fe+1wgHxeISykid2kV2YsPhJTaghF0RrIXHyBr/h7lPurp/oH2z5/B3T1S69QaTTOgO2HKKifjt+9gypw1MvNkCQQBEOirP4jj+mHMk5cy4Td/CGQ5ciB7ApBxtX1D++ebI348JuIyh0m9fwspM/+qBJz/jozX2U73hXeUB2qRJmpkEtgrJpdsZMLUVcQlT1UOF4xGlrx4bv9I/9UP/ccSI1BRH4uokhmMtfgvpM/ehj4xE6+zjY4zW+m5/PfgblFDxALQL2Gor9FfXQKQff7XUUxUy7zbiGqZo783FInv9fxaolqmq/0szhvH8bk6cd44rvn3en4tUR2A7jaiembebcRkhpGYzDASkxlGYjLDSExmGInJDCMxmWEkJjOMxGSGkZjMMBKTGUZiMsPIfwCq6cn/diBBMgAAAABJRU5ErkJggg==',
            sheep: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFMAAABTCAYAAADjsjsAAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAsLSURBVHhe7Zt5dFTVHYC/N2+WzJZMFhIgkISEJSwBDKsiLketUrR1A6uWUzcU0YJLQVFRDopWabXiglqtp9qDtdjaU4+CHlFWxRBRQSCQsEUiJGSZJDOZzPLm9Y8XXpkHosDNpHDed86ck3n3d98fX37v3vvu/Y306bBMFRMhWIwXTE4cU6ZATJkCMWUKxJQpEFOmQEyZAjFlCsSUKRBTpkBMmQIxZQrElCkQU6ZATJkCMWUKxJQpEFOmQEyZApFOtzOgnEsn0+OX1+EZOBSr2wuShBpXiDbW07D6I/a8vJBw7ffGbkI4bWSmDh1J31kLSB1SCpJkbNYJVe+i8qkHaFz7sbHppDktZGadN4Gie+fj7N0HgKi/gaayNfg3rEUJtWHzZZIz4Uo8xSVIspVg5Va2P3oPLZvKjbc6KU55mb2uu5X822ZhS0tHVWLUf/I+FfNmogQDxlCKH32BnIlXI1lkAju2sO3+Wwnu2m4MO2HkG7q75hkvnioUznyY/Kn3YHV7iYfb2fe3l9jx6L2o0YgxFID6Tz/A2asP7n4DcWRmk1Y6luYvPyfa1GAMPSFOSZmy28OgxxfT4/LrsdjsRJub2PPCE+x99Wlj6BE0la3GM6AEZ+8CHJnZuAr74y9bgxJsNYYeN6fc0shdOICSRUvoduEvkGQr7Qf2sf2RGexb8oox9KgowQBb75+Kf8NaANJHnU3x/OeQ3R5j6HFzSsn0jRzHoIWv4Ss9E4DAji1snX0L9SuXQUfGDl28lHM31lH6xnJD7/+hBAN8e89vaCpbDUD66HMY+NiLxrDj5pSRmTNxEgOfeBl3UTGqGqdx3Qo2//bahBk591e34Cs9C8liQbJaj5ltSjBA1ZMPaBOQJOEdNJy00rHGsOOi02Zz2e0hd/JNZE+4CmevAmSn65jrv59KPBqh9v2lVC188IgZe+jipWSceT6x1mZ2PjOP/f96M6HdiOz2UPrGctxFxYTr9lPx0HSaytYYw34ynZKZvadMZ8x75RTOfBhP/8HILrcQkUowwHd/fZ7tP7D0ceT0BCDqb6T5y8+MzUeQe83NOHsVABBpOHhSIhGdmbLbQ99ZC8iZOAmLzQ6qSvjgAfwb1uLfsJZ4LGrscly07a6kdctXxss6I976BO/AoUTqa9n20B00rV+pt6WPHo89u4f+3TtwGN0vuwZrqo94OEz168+y56Wn9PYTQajMwxfFSjDAgf+8xa7nFxw1izqDQU+8QvYlV6CqKg0rl7Ft7h0owQC5k2+i8K5HtCfEgKrEqP3gHSrm3mlsOm6EPeYF02aT/bPLkSwysdZmdr/wOJVPzkmaSID6VcuItviRLBZ8o8eTdc7FAHhLSo8QqSox2mv2svv5x4WIRJRMV34R2ZdcicXhIB4OU/P2X37yuk8kdcvfpeatP6MEA0QOHiBUsxcAZ14hAJH6Wr6ZdjUrh2exakR31k8cQfXriwx3OXGEyMy68DJSevQGoPmbMqpff9YYkjT2vPQUa8YVUHbFWbRsKsc7+Awc3boDEG1qSBhHRSNEZmrJSD0rm75YldRH+8dw5RViTfUBEKqpNjYLRYhMZ24eALFgK8GqbcbmLsUzcBiy04WqxAhV7zI2C0WITGQZADUWJR5qM7Z2Kc68QiTZSjwcpk3gdtvRECPz/xj9qWltpq16p7FZKJ0m05HTk/Sx5xkvJ5X0sedhS88EINbip3njemOIUDpFZv7Uexm1dDVDX3ybAfO6bmZ3FfRFdnshCZMPomVKspWC6fdTMG0W1lQfkkXWl0xdgatPPyyOlKRMPoiWac/sRtrwMUiy1djUJTjzCpEslqRMPoiWCYCq0ra7EqU9ZGxJKq78In1HKBmTD8JkKgoAsUAL+5a8zN7XntGvdRXu/kP0xXqksb7TJx9Eyax8cg7Vry/i27umULXwIWNzl+Au7I/s1DY3QknISkTJ9JevY9ez8/GXrwPAlpahL+S7Cu+QUix2O/FohNDeU0jm4fS4/Hrybr4LOcUJgNIFb0QFt9+Hb+Q4AML791G3/F1jSKcgVGbPSTdQePc87BlZoKoEdmxh96JHjWGdSp87H6D3r29HdrqIh8PUfvCO0KqNYyFMZq/rbqVwxlxsaemgqrRs+Up4+cmx8I0cR+kby8m7cQay24MaV6j76N8nfRRxPAg5tiiYNpveU6ZrR6uqSvNXX7DjsXuPKdJdOID8235Hxpnnn9C6tL22hp1PP6JXs/Wf+zQ9r5wCkqRl5Pv/oOqPc5O6HSgkM7tdcKkusqlsNVvn/HBGOnJ6MnDBYkrf/JDsi6/AmupDdnuO++Mq6Efm+Iv0+yrBAGpcQY1F2bfkZbbPvzupIhEl89DMHT54gOrX/nTUYlLZ7aHffU8waulqciZO0uSfBJLFgqe4RP+uBFtRlTiS1YbNl5EQmyzEyPwR8m6cwZj3ysm9dqq+kKZjJ2fXc4+xcnjWEZ9g5VYA2r+v5svrL2Ll8Cwqf39/wuogpUdv0kePByBUs1evfnN0z9VjkkmnysydfJNWjDBjrjbDo71u6kJkmcjB2oQ+AN7BZ+iZq7SH9LPytGGj9SUXgC0tHe+g4dDxyqiE2wGwWG16TDLpNJmFMx+m7+wFOHsX6NUcsRY/NX9/lZolrxCPRpCdbryDNRmHY/WmYbE7AIg2HISOYcLdf1BHjXocVBWLIwVX0QDokHkoM22Z3Q67W/LoNJme4hIkQ4YEqyqofHIOrRWbUdqCSBYL7kJNxuHYs7L1V8FYxyTS7YLL9Mc3WLWNaIsfAHffQQA0b1xPrKPG0ur2nnQR1onQKTJlt4eU7r2go4anff93ALj7FpMz4SoaP1tBtLEegJTcPLyDz0jo78orRLLbAYg2aXHewcORnW5UJUbTF6uI1GvDgyOnJ5nnasUGsdZmACSbHas3Tb9fsugUmRlnXYCtY4wM1+2nce0K1Hgc2ZNKWumZKMEAbR3vy7b0LFJLRiT0t6ala4dg0QiRgwcASB06CsliIdrsx1++Tj8FtXpTSe34ZyhtQQBkR8rpI9O4Y9O88XOUQItWtjLqbFz5RQSrthKPRrRxr0+/hP42XwaSxYIaixFprCfz3Iv1CrfQd7toWPUhgW2biIfbsdjsuPsPASB8oAYAyW7H1VHFkUw6RWZKr3xtxyYSoW3XDmqX/ZNgVQUAjuwepI85l8D2Lfq4efh6EcDm0w7BVCVGrLkJ34hx2NJ8qPE4gYrNALRu/ZpocxMA7qIBuPKLiLW2oCoxJNmKNS094Z7JoFNkHpoUYoEWWis2AdCw7mPi4TCyy03G+IsSxk1Ht+4J46a9Ww50PLaRhjpSh5QiyVZirc34y7W6y6ayNfpYbMvIInXY6P8t3C2WIwq1koFQmZJFJnXYaBwdMqJN9foep3/DWiKNdQB4+g0i5+dX65PI4eNmWulY7Wd6HUUNnuISnHnaj6XC+/fR+NkKDhGo2KyNxU436WPO0fsAOLK1YSGZCJVpz8qmzx1zsGdpMoNV2/T345ZN5bR8vQFUFUf3XPo/+Ad8o84GQE5x4u6nZbPVm4Zk02bylJ55FN0zX7ufqtJasSnhfbt1y9coIW2oyJk4iYLb79MzUn9JSCJCZLbtrECNJ575KKE2Atu0R/wQ9auWEfU3JlwDiEfCROr2AxDaU6X9rSZuZkX9jUdUsB1c8R6hPVVHxKKqhPbtSbyWBIRswZloCMlMEw1TpkBMmQIxZQrElCkQU6ZATJkCMWUKxJQpEFOmQEyZAjFlCsSUKRBTpkBMmQIxZQrkvxVHJbTqpEuoAAAAAElFTkSuQmCC'
        };
        let gridSearchTerm = '';
        let expandedEligibilityId = null;

        function checkBackupReminder() {
            if (brothers.length === 0 && assignments.length === 0) return;
            const last = localStorage.getItem('atk_lastBackup');
            const days = last ? (Date.now() - new Date(last).getTime()) / 86400000 : Infinity;
            if (days >= 7) {
                const banner = document.getElementById('backupReminder');
                if (banner) banner.classList.remove('hidden');
            }
        }

        // Initialize
        function init() {
            loadData();
            loadMeetingEditorData();
            // Get current date in Philippine time (Asia/Manila)
            const manilaStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
            const phTime = new Date(manilaStr);
            const monthStr = `${phTime.getFullYear()}-${String(phTime.getMonth() + 1).padStart(2, '0')}`;
            document.getElementById('monthSelect').value = monthStr;
            document.getElementById('monthSelect').addEventListener('change', function() {
                updateGridStartMonth();
                render();
            });
            updateGridStartMonth();
            switchView('grid'); // Show grid view by default
                    checkBackupReminder();
        }

        // Set grid start month based on selected month (center it in the visible range)
        function updateGridStartMonth() {
            const monthStr = document.getElementById('monthSelect').value;
            const [, month] = monthStr.split('-').map(Number);
            // Try to place selected month near the start so user can see ahead
            gridStartMonth = Math.max(1, Math.min(month, 12 - GRID_MONTH_COUNT + 1));
            renderMonthScrollPills();
        }

        // Render the month pill buttons
        function renderMonthScrollPills() {
            const container = document.getElementById('monthScrollPills');
            if (!container) return;
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const endMonth = Math.min(gridStartMonth + GRID_MONTH_COUNT - 1, 12);
            let html = '';
            for (let m = 1; m <= 12; m++) {
                const isActive = m === gridStartMonth;
                const inRange = m >= gridStartMonth && m <= endMonth;
                const cls = isActive ? 'month-pill active' : inRange ? 'month-pill in-range' : 'month-pill';
                html += `<button class="${cls}" onclick="setGridStartMonth(${m})">${monthNames[m - 1]}</button>`;
            }
            container.innerHTML = html;
        }

        // Set start month directly (from clicking a pill)
        function setGridStartMonth(m) {
            gridStartMonth = Math.max(1, Math.min(m, 12 - GRID_MONTH_COUNT + 1));
            renderMonthScrollPills();
            renderGrid();
        }

        // Shift month range by delta (-1 = left, +1 = right)
        function shiftMonthRange(delta) {
            const newStart = gridStartMonth + delta;
            if (newStart < 1 || newStart > 12 - GRID_MONTH_COUNT + 1) return;
            gridStartMonth = newStart;
            renderMonthScrollPills();
            renderGrid();
        }

        // Local storage functions
        function saveData() {
            localStorage.setItem('atk_brothers', JSON.stringify(brothers));
            localStorage.setItem('atk_assignments', JSON.stringify(assignments));
            localStorage.setItem('atk_sundayAssignments', JSON.stringify(sundayAssignments));
            localStorage.setItem('atk_brotherEligibility', JSON.stringify(brotherEligibility));
        }

        function loadData() {
            const savedBrothers = localStorage.getItem('atk_brothers');
            const savedAssignments = localStorage.getItem('atk_assignments');
            const savedSunday = localStorage.getItem('atk_sundayAssignments');
            const savedEligibility = localStorage.getItem('atk_brotherEligibility');
            
            if (savedBrothers) brothers = JSON.parse(savedBrothers);
            if (savedAssignments) assignments = JSON.parse(savedAssignments);
            if (savedSunday) sundayAssignments = JSON.parse(savedSunday);
            if (savedEligibility) brotherEligibility = JSON.parse(savedEligibility);
            
            
            // Auto-fix names: convert "Last, First" or "Last. First" to "First Last"
            let namesFixed = false;
            brothers.forEach(brother => {
                if (brother.name) {
                    // Handle comma separator
                    if (brother.name.includes(',')) {
                        const parts = brother.name.split(',').map(p => p.trim());
                        if (parts.length >= 2) {
                            brother.name = `${parts[1]} ${parts[0]}`;
                            namesFixed = true;
                        }
                    }
                    // Handle period separator (e.g., "Castillo. JP")
                    else if (brother.name.includes('. ') || brother.name.match(/\.\s*\w/)) {
                        const parts = brother.name.split(/\.\s*/).map(p => p.trim());
                        if (parts.length >= 2 && parts[1]) {
                            brother.name = `${parts[1]} ${parts[0]}`;
                            namesFixed = true;
                        }
                    }
                }
            });
            if (namesFixed) {
                localStorage.setItem('atk_brothers', JSON.stringify(brothers));
            }
            
            // Initialize eligibility and selection state for brothers that don't have it yet
            brothers.forEach(brother => {
                if (brother.isSelectable === undefined) {
                    brother.isSelectable = true;
                }
                if (!brotherEligibility[brother.id]) {
                    brotherEligibility[brother.id] = {};
                    ASSIGNMENT_TYPES.forEach(type => {
                        brotherEligibility[brother.id][type] = true;
                    });
                }
            });
        }

        function snapshotAssignmentState() {
            return {
                assignments: JSON.parse(JSON.stringify(assignments)),
                sundayAssignments: JSON.parse(JSON.stringify(sundayAssignments))
            };
        }

        function pushAssignmentUndoState() {
            undoStack.push(snapshotAssignmentState());
            if (undoStack.length > 20) {
                undoStack.shift();
            }
        }

        function undoLastAssignmentChange() {
            if (!undoStack.length) {
                alert('No recent assignment change to undo.');
                return;
            }

            const previousState = undoStack.pop();
            assignments = previousState.assignments;
            sundayAssignments = previousState.sundayAssignments;
            saveData();
            closeAssignModal();
            render();
        }

        // Get Thursdays belonging to a month based on week-start (Monday).
        // A Thursday belongs to the month where its Monday (start of the week) falls.
        // E.g., if Thursday is July 2 but Monday is June 29, it belongs to June.
        function getThursdaysForMonthByWeekStart(year, month) {
            const thursdays = [];
            const start = new Date(`${year}-${String(month).padStart(2, '0')}-01T12:00:00+08:00`);
            const nextMonth = month === 12 ? 1 : month + 1;
            const nextYear = month === 12 ? year + 1 : year;
            const end = new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-04T12:00:00+08:00`);
            
            for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
                if (d.getDay() === 4) { // Thursday
                    // Monday = Thursday - 3 days (using ms to avoid setDate month-rollover issues)
                    const monday = new Date(d.getTime() - 3 * 86400000);
                    if (monday.getMonth() === month - 1 && monday.getFullYear() === year) {
                        const ty = d.getFullYear();
                        const tm = d.getMonth() + 1;
                        const td = d.getDate();
                        thursdays.push(`${ty}-${String(tm).padStart(2, '0')}-${String(td).padStart(2, '0')}`);
                    }
                }
            }
            return thursdays;
        }

        // Get Thursdays in month (using week-start grouping)
        function getThursdaysInMonth() {
            const monthStr = document.getElementById('monthSelect').value;
            const [year, month] = monthStr.split('-').map(Number);
            return getThursdaysForMonthByWeekStart(year, month);
        }

        // Get Sunday for Thursday (next Sunday in Philippine time)
        function getSundayForThursday(thursdayDate) {
            const thursday = new Date(thursdayDate + 'T12:00:00+08:00'); // Philippine time
            const daysUntilSunday = (7 - thursday.getDay()) || 7;
            const sunday = new Date(thursday);
            sunday.setDate(thursday.getDate() + daysUntilSunday);
            
            const year = sunday.getFullYear();
            const month = String(sunday.getMonth() + 1).padStart(2, '0');
            const day = String(sunday.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        // Check if brother has Sunday assignment
        function hasSundayAssignment(brotherId, thursdayDate) {
            const sundayDate = getSundayForThursday(thursdayDate);
            return sundayAssignments.some(sa => sa.brotherId === brotherId && sa.date === sundayDate);
        }

        // Toggle Sunday assignment
        function toggleSundayAssignment(brotherId, thursdayDate) {
            pushAssignmentUndoState();
            const sundayDate = getSundayForThursday(thursdayDate);
            const index = sundayAssignments.findIndex(sa => sa.brotherId === brotherId && sa.date === sundayDate);
            
            if (index >= 0) {
                sundayAssignments.splice(index, 1);
            } else {
                sundayAssignments.push({
                    id: `sunday-${Date.now()}`,
                    brotherId,
                    date: sundayDate
                });
            }
            saveData();
            render();
        }

        // Check availability
        function checkAvailability(brotherId, date, assignmentType) {
            const [year, month] = date.split('-');
            const monthKey = `${year}-${month}`;
            
            const monthAssignments = assignments.filter(a => 
                a.brotherId === brotherId && a.date.startsWith(monthKey)
            );
            
            const hasSunday = hasSundayAssignment(brotherId, date);
            const warnings = [];
            
            if (hasSunday) {
                warnings.push('May Sunday assignment sa week na ito');
            }
            
            if (monthAssignments.length >= 1) {
                warnings.push('May 1 Thursday assignment na ngayong buwan');
            }
            
            if (monthAssignments.length >= 2) {
                warnings.push('⚠️ STRICT WARNING: 2 Thursday assignments na sa buwan na ito');
            }

            // New: enforce hard limit of 3 per month
            if (monthAssignments.length >= 3) {
                warnings.push('✋ MAX: 3 Thursday assignments na ngayong buwan');
                return {
                    canAssign: false,
                    warnings,
                    status: 'blocked'
                };
            }
            
            return {
                canAssign: true, // Allow assignment unless blocked by limit
                warnings,
                status: monthAssignments.length === 0 && !hasSunday ? 'available' : 
                        monthAssignments.length === 1 || hasSunday ? 'warning' : 'warning'
            };
        }

        function isSelectableForAssignment(brother) {
            return !!brother && brother.isSelectable !== false;
        }

        // Add: compute smart suggestions for a date+type used by the Assign modal
        function getSuggestionsForSlot(date, type) {
            const suggestions = [];
            const [year, month] = date.split('-');
            const monthKey = `${year}-${month}`;

            // total assignments across all brothers for averaging
            const totalAssigned = assignments.length;
            const avgAssignments = totalAssigned / Math.max(1, brothers.length);

            brothers.forEach(brother => {
                if (!isSelectableForAssignment(brother)) return;

                // skip if marked ineligible for this type
                if (brotherEligibility[brother.id]?.[type] === false) return;

                // skip if already reached monthly limit
                const monthAssignments = assignments.filter(a => a.brotherId === brother.id && a.date.startsWith(monthKey)).length;
                if (monthAssignments >= 3) return;

                const availability = checkAvailability(brother.id, date, type);
                // only show brothers that can be assigned (we still surface warnings)
                if (!availability.canAssign) return;

                // base score
                let score = 100;

                // penalties from availability warnings
                availability.warnings.forEach(warning => {
                    if (warning.toLowerCase().includes('sunday')) score -= 20;
                    if (warning.toLowerCase().includes('1 thursday')) score -= 15;
                    if (warning.toLowerCase().includes('strict warning')) score -= 35;
                });

                // per-type fairness: penalize by how many times this brother ALREADY has this type
                const sameTypeCount = assignments.filter(a => a.brotherId === brother.id && a.type === type).length;
                score -= sameTypeCount * 30;

                // still slightly discourage repeating the immediately-previous assignment type
                const allBrotherAssignments = assignments.filter(a => a.brotherId === brother.id).sort((a, b) => new Date(b.date) - new Date(a.date));
                if (allBrotherAssignments.length > 0 && allBrotherAssignments[0].type === type) {
                    score -= 10;
                }

                // bonus if never had this type
                const hasHadThisType = assignments.some(a => a.brotherId === brother.id && a.type === type);
                if (!hasHadThisType) score += 20;

                // fairness: prefer brothers with fewer total assignments
                const totalForBrother = assignments.filter(a => a.brotherId === brother.id).length;
                if (totalForBrother < avgAssignments) score += 15;
                else if (totalForBrother > avgAssignments * 1.5) score -= 15;

                suggestions.push({
                    brother,
                    score: Math.max(0, Math.min(100, Math.round(score))),
                    totalAssignments: totalForBrother,
                    warnings: availability.warnings
                });
            });

            // sort by fewest totalAssignments (fairness) then by score descending
            suggestions.sort((a, b) => {
                if (a.totalAssignments !== b.totalAssignments) return a.totalAssignments - b.totalAssignments;
                return b.score - a.score;
            });

            return suggestions;
        }

        // Import brothers


        // Convert "LastName, FirstName" or "LastName. FirstName" to "FirstName LastName"
        function formatName(name) {
            if (name.includes(',')) {
                const parts = name.split(',').map(p => p.trim());
                if (parts.length >= 2) {
                    return `${parts[1]} ${parts[0]}`;
                }
            }
            // Handle period separator (e.g., "Castillo. JP")
            if (name.includes('. ') || name.match(/\.\s*\w/)) {
                const parts = name.split(/\.\s*/).map(p => p.trim());
                if (parts.length >= 2 && parts[1]) {
                    return `${parts[1]} ${parts[0]}`;
                }
            }
            return name;
        }

        // Fix all existing names to "FirstName LastName" format


        // Remove brother
        function removeBrother(id) {
            if (!confirm('Are you sure you want to remove this brother? All assignments will be deleted.')) return;
            brothers = brothers.filter(b => b.id !== id);
            assignments = assignments.filter(a => a.brotherId !== id);
            sundayAssignments = sundayAssignments.filter(a => a.brotherId !== id);
            delete brotherEligibility[id];
            saveData();
            render();
        }
        
        // Toggle eligibility
        function toggleEligibilityPanel(brotherId) {
            expandedEligibilityId = expandedEligibilityId === brotherId ? null : brotherId;
            renderAssignmentSelectionModal();
        }

        function toggleEligibility(brotherId, assignmentType) {
            if (!brotherEligibility[brotherId]) {
                brotherEligibility[brotherId] = {};
            }
            brotherEligibility[brotherId][assignmentType] = !brotherEligibility[brotherId][assignmentType];
            saveData();
            render();
            renderAssignmentSelectionModal();
        }

        function showAssignmentSelectionModal() {
            renderAssignmentSelectionModal();
            document.getElementById('assignmentSelectionModal').classList.remove('hidden');
            document.body.classList.add('modal-open');
        }

        function closeAssignmentSelectionModal() {
            document.getElementById('assignmentSelectionModal').classList.add('hidden');
            document.body.classList.remove('modal-open');
        }

        function renderAssignmentSelectionModal() {
            const container = document.getElementById('assignmentSelectionContent');
            if (!container) return;

            if (brothers.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-center py-8">No brothers yet. Add names to start managing assignment selection.</p>';
                return;
            }

            const sortedBrothers = [...brothers].sort((a, b) => a.name.localeCompare(b.name));
            let html = '<div class="space-y-3">';

            sortedBrothers.forEach(brother => {
                const selected = isSelectableForAssignment(brother);
                const elig = brotherEligibility[brother.id] || {};
                const eligibleCount = ASSIGNMENT_TYPES.filter(t => elig[t] !== false).length;
                const isExpanded = expandedEligibilityId === brother.id;
                html += `<div class="rounded-xl border border-gray-200 p-3">
                    <div class="flex items-center justify-between gap-3">
                        <div>
                            <div class="font-semibold text-gray-900">${brother.name}</div>
                            <div class="text-xs text-gray-500">${selected ? 'Included in assignment picks' : 'Excluded from assignment picks'} • ${getBrotherCategory(brother)}</div>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="toggleBrotherAssignmentSelection('${brother.id}')" class="px-3 py-2 rounded-lg text-sm font-semibold ${selected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-700'}">
                                ${selected ? 'Included' : 'Excluded'}
                            </button>
                            <button onclick="removeBrother('${brother.id}')" class="px-3 py-2 rounded-lg text-sm font-semibold bg-red-100 text-red-700" title="Delete brother">
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                    <div class="flex items-center justify-between gap-3 mt-2">
                        <div class="text-xs text-gray-600">Eligible for ${eligibleCount}/${ASSIGNMENT_TYPES.length} types</div>
                        <button onclick="toggleEligibilityPanel('${brother.id}')" class="px-3 py-1 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700">
                            ⚙️ Eligibility ${isExpanded ? '▲' : '▼'}
                        </button>
                    </div>
                    ${isExpanded ? `
                    <div class="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-2">
                        ${ASSIGNMENT_TYPES.map(type => `
                        <label class="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-100 text-sm">
                            <input type="checkbox" ${elig[type] !== false ? 'checked' : ''} onchange="toggleEligibility('${brother.id}', '${type}')" class="w-4 h-4">
                            <span>${type}</span>
                        </label>`).join('')}
                    </div>` : ''}
                </div>`;
            });

            html += '</div>';
            container.innerHTML = html;
        }

        function toggleBrotherAssignmentSelection(brotherId) {
            const brother = brothers.find(b => b.id === brotherId);
            if (!brother) return;

            brother.isSelectable = brother.isSelectable === false ? true : false;
            saveData();
            render();
            renderAssignmentSelectionModal();
        }

        function addNameToAssignmentSelection() {
            const input = document.getElementById('assignmentSelectionName');
            const categorySelect = document.getElementById('assignmentSelectionCategory');
            const name = (input?.value || '').trim();
            if (!name) return;

            const formattedName = formatName(name);
            const selectedCategory = categorySelect?.value || 'Elder';
            const existingBrother = brothers.find(b => b.name.toLowerCase() === formattedName.toLowerCase());

            if (existingBrother) {
                existingBrother.isSelectable = true;
                existingBrother.category = selectedCategory;
                saveData();
                render();
                renderAssignmentSelectionModal();
                input.value = '';
                return;
            }

            const newId = `brother-${Date.now()}-${Math.random()}`;
            brothers.push({
                id: newId,
                name: formattedName,
                isSelectable: true,
                category: selectedCategory
            });
            brotherEligibility[newId] = {};
            ASSIGNMENT_TYPES.forEach(type => {
                brotherEligibility[newId][type] = true;
            });

            saveData();
            render();
            renderAssignmentSelectionModal();
            input.value = '';
        }

        // Show assign modal (enhanced with ranked suggestions + search)
        function showAssignModal(date, type) {
            if (!date || !type) {
                console.error('Invalid date or type for assign modal');
                return;
            }

            selectedDate = date;
            selectedType = type;

            const dateObj = new Date(date + 'T00:00:00');
            document.getElementById('assignModalTitle').textContent = `Assign: ${type}`;
            document.getElementById('assignModalDate').textContent = `${dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`;

            // Clear search and render suggestions
            const searchInput = document.getElementById('assignSearch');
            if (searchInput) searchInput.value = '';
            
            // Render suggestions (this will populate the modal)
            renderAssignModalSuggestions('');

            document.getElementById('assignModal').classList.remove('hidden');
            document.body.classList.add('modal-open');
            
            // Focus search input for immediate filtering
            setTimeout(() => searchInput && searchInput.focus(), 100);
        }

        // Render assign modal suggestions filtered by searchTerm
        function renderAssignModalSuggestions(searchTerm = '') {
            const date = selectedDate;
            const type = selectedType;
            if (!date || !type) return;

            const suggestions = getSuggestionsForSlot(date, type) || [];
            const q = (searchTerm || '').trim().toLowerCase();

            let html = '';
            let visibleCount = 0;

            if (suggestions.length === 0) {
                html = '<div class="text-center py-8"><p class="text-gray-500">No eligible brothers available for this assignment.</p></div>';
            } else {
                suggestions.forEach((sug, idx) => {
                    if (q && !sug.brother.name.toLowerCase().includes(q)) return;

                    const availability = checkAvailability(sug.brother.id, date, type);
                    const isRecommended = idx === 0 && sug.score >= 70;

                    const [year, month] = date.split('-');
                    const monthCount = assignments.filter(a => a.brotherId === sug.brother.id && a.date.startsWith(`${year}-${month}`)).length;
                    const capacityLeft = Math.max(0, 3 - monthCount);

                    const borderClass = availability.status === 'available' ? 'border-emerald-300' :
                                       availability.status === 'warning' ? 'border-amber-300' : 'border-red-300';
                    const bgClass = availability.status === 'available' ? 'bg-emerald-50' :
                                   availability.status === 'warning' ? 'bg-amber-50' : 'bg-red-50';

                    html += `<div class="border rounded-md p-3 md:p-4 mb-2 flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${borderClass} ${bgClass}">
                        <div class="flex-1 min-w-0 text-sm">
                            <div class="flex items-center gap-2 mb-1">
                                <div class="font-bold text-gray-900 truncate">${sug.brother.name}</div>
                                ${isRecommended ? '<span class="badge-recommended flex-shrink-0">⭐ Recommended</span>' : ''}
                            </div>
                            <div class="text-xs text-gray-600 mb-2">
                                Capacity: <strong class="text-gray-800">${capacityLeft}/3</strong> • Total: <strong>${sug.totalAssignments}</strong>
                            </div>
                            ${availability.warnings.length ? `<div class="text-xs text-amber-700 space-y-1">${availability.warnings.map(w => '⚠️ '+w).join('<br>')}</div>` : ''}
                        </div>

                        <div class="flex items-center gap-2 flex-shrink-0">
                            <div class="text-center">
                                <div class="text-sm font-bold text-gray-700">${sug.score}%</div>
                                <div class="text-xs text-gray-500">Score</div>
                            </div>
                            <button onclick="assignBrother('${date}', '${type}', '${sug.brother.id}')" 
                                ${!availability.canAssign ? 'disabled' : ''} 
                                class="btn-primary text-sm px-3 py-2">
                                Assign
                            </button>
                        </div>
                    </div>`;
                    visibleCount++;
                });

                if (visibleCount === 0 && q) {
                    html = '<div class="text-center py-6"><p class="text-gray-500">No brothers match your search.</p></div>';
                }
            }

            document.getElementById('assignModalContent').innerHTML = html;
        }

        function closeAssignModal() {
            document.getElementById('assignModal').classList.add('hidden');
            selectedDate = null;
            selectedType = null;
            document.body.classList.remove('modal-open');
        }

        // Assign brother
        function assignBrother(date, type, brotherId) {
            pushAssignmentUndoState();

            // If removing assignment for single-slot: brotherId === null
            if (brotherId === null) {
                // remove existing assignment (single-slot) for that date & type
                assignments = assignments.filter(a => !(a.date === date && a.type === type));
                saveData();
                render();
                return;
            }

            // For adding: verify limit (3 per month) before pushing
            const [year, month] = date.split('-');
            const monthKey = `${year}-${month}`;
            const monthCount = assignments.filter(a => a.brotherId === brotherId && a.date.startsWith(monthKey)).length;

            if (monthCount >= 3) {
                alert('Hindi pwedeng mag-assign — mayroon na siyang 3 assignments ngayong buwan.');
                return;
            }

            // Special-case Pamumuhay: allow up to 2 brothers (append, don't overwrite)
            if (type === 'Pamumuhay') {
                // Prevent duplicate same brother for same slot
                const exists = assignments.some(a => a.date === date && a.type === type && a.brotherId === brotherId);
                if (!exists) {
                    assignments.push({
                        id: `assignment-${Date.now()}-${Math.random()}`,
                        date,
                        type,
                        brotherId
                    });
                }
            } else {
                // Regular single-slot assignment: replace existing assignment for that slot
                assignments = assignments.filter(a => !(a.date === date && a.type === type));
                if (brotherId) {
                    assignments.push({
                        id: `assignment-${Date.now()}-${Math.random()}`,
                        date,
                        type,
                        brotherId
                    });
                }
            }

            saveData();
            closeAssignModal();
            render();
        }

        // Remove a specific assignment by its id (used for Pamumuhay removal)
        function removeAssignmentById(id) {
            pushAssignmentUndoState();
            assignments = assignments.filter(a => a.id !== id);
            saveData();
            render();
        }

        // Improve view button toggling to use simple classes (keeps UI consistent)
        function switchView(view) {
            currentView = view;
            // Hide all views
            document.getElementById('gridView').classList.add('hidden');
            document.getElementById('pdfEditorView').classList.add('hidden');
            document.getElementById('sundayView').classList.add('hidden');

            // Reset button styles
            document.getElementById('gridBtn').className = 'btn-secondary';
            document.getElementById('pdfEditorBtn').className = 'btn-secondary';
            document.getElementById('sundayBtn').className = 'btn-secondary';

            // Show selected view and highlight button
            if (view === 'grid') {
                document.getElementById('gridView').classList.remove('hidden');
                document.getElementById('gridBtn').className = 'btn-primary';
                populateGridTypeDropdown();
                renderMonthScrollPills();
            } else if (view === 'pdfEditor') {
                document.getElementById('pdfEditorView').classList.remove('hidden');
                document.getElementById('pdfEditorBtn').className = 'btn-primary';
            } else if (view === 'sunday') {
                document.getElementById('sundayView').classList.remove('hidden');
                document.getElementById('sundayBtn').className = 'btn-primary';
            }
            render();
        }

        // Render
        function render() {
            if (currentView === 'grid') {
                renderGrid();
            } else if (currentView === 'pdfEditor') {
                renderPdfEditor();
            } else if (currentView === 'sunday') {
                renderSundayView();
            }
        }

        // Clear all assignments
        function clearAllAssignments() {
            if (!confirm('Are you sure you want to clear ALL assignments? This cannot be undone.')) return;
            pushAssignmentUndoState();
            assignments = [];
            saveData();
            render();
        }

        function startAutoAssign() {
            if (brothers.length === 0) { alert('Wala pang brothers. Mag-add muna sa Manage Selection.'); return; }
            const thursdaysByMonth = getThursdaysForYear();
            const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

            // Simulate by temporarily pushing accepted proposals into `assignments`
            // so the existing scoring engine accounts for prior picks (limits, fairness,
            // same-type penalty). We roll back before showing the preview — nothing saved.
            const originalAssignments = JSON.parse(JSON.stringify(assignments));
            const proposed = [];   // {date, type, brotherId, brotherName, score, monthLabel, dateLabel}
            let unfilled = 0;

            // Enumerate months in visible order
            const months = Object.keys(thursdaysByMonth).map(Number).sort((a, b) => a - b);
            const monthStr = document.getElementById('monthSelect').value;
            const [selectedYear] = monthStr.split('-').map(Number);

            months.forEach(month => {
                const thursdays = thursdaysByMonth[month] || [];
                thursdays.forEach(date => {
                    ASSIGNMENT_TYPES.forEach(type => {
                        // Skip if this slot already has an assignment (empty slots only)
                        const alreadyFilled = assignments.some(a => a.date === date && a.type === type);
                        if (alreadyFilled) return;

                        // Brothers already assigned/proposed on this SAME date (any type) — avoid double-booking in one week
                        const takenThisDate = new Set(assignments.filter(a => a.date === date).map(a => a.brotherId));

                        const suggestions = getSuggestionsForSlot(date, type) || [];
                        const pick = suggestions.find(s => !takenThisDate.has(s.brother.id));
                        if (!pick) { unfilled++; return; }

                        // Record proposal + temporarily commit for fairness in subsequent slots
                        assignments.push({ id: `tmp-${Date.now()}-${Math.random()}`, date, type, brotherId: pick.brother.id });
                        const dObj = new Date(date + 'T12:00:00+08:00');
                        proposed.push({
                            date, type,
                            brotherId: pick.brother.id,
                            brotherName: pick.brother.name,
                            score: pick.score,
                            monthLabel: `${monthNames[month]} ${selectedYear}`,
                            dateLabel: dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        });
                    });
                });
            });

            // Roll back temp assignments — nothing is saved until Apply
            assignments = originalAssignments;

            autoAssignPreview = proposed;
            autoAssignUnfilled = unfilled;
            renderAutoAssignPreview();
            document.getElementById('autoAssignModal').classList.remove('hidden');
            document.body.classList.add('modal-open');
        }

        function renderAutoAssignPreview() {
            const container = document.getElementById('autoAssignContent');
            const summary = document.getElementById('autoAssignSummary');
            const applyBtn = document.getElementById('autoAssignApplyBtn');
            if (!container) return;

            const proposed = autoAssignPreview || [];
            if (proposed.length === 0) {
                container.innerHTML = '<div class="text-center py-8"><p class="text-gray-500">Walang empty slot na mapupunan (o walang eligible na brother).</p></div>';
                if (summary) summary.textContent = 'No proposals.';
                if (applyBtn) applyBtn.disabled = true;
                return;
            }
            if (applyBtn) applyBtn.disabled = false;
            if (summary) summary.textContent = `${proposed.length} proposed assignment(s)` + (autoAssignUnfilled ? ` • ${autoAssignUnfilled} slot(s) walang eligible` : '');

            // Group by month, then by date
            const byMonth = {};
            proposed.forEach((p, idx) => {
                if (!byMonth[p.monthLabel]) byMonth[p.monthLabel] = {};
                if (!byMonth[p.monthLabel][p.dateLabel]) byMonth[p.monthLabel][p.dateLabel] = [];
                byMonth[p.monthLabel][p.dateLabel].push({ ...p, idx });
            });

            let html = '';
            Object.keys(byMonth).forEach(monthLabel => {
                html += `<div class="mb-4"><div class="font-bold text-gray-900 mb-2">${monthLabel}</div>`;
                Object.keys(byMonth[monthLabel]).forEach(dateLabel => {
                    html += `<div class="mb-2"><div class="text-xs font-semibold text-gray-600 mb-1">${dateLabel}</div>`;
                    byMonth[monthLabel][dateLabel].forEach(p => {
                        html += `<div class="flex items-center justify-between gap-2 border border-gray-200 rounded-lg p-2 mb-1 text-sm">
                            <div class="flex-1 min-w-0">
                                <span class="text-gray-600">${p.type}:</span>
                                <span class="font-semibold text-gray-900">${p.brotherName}</span>
                                <span class="text-xs text-gray-500">(${p.score}%)</span>
                            </div>
                            <button onclick="removeAutoAssignItem(${p.idx})" class="remove-part-btn" title="Alisin ito">✕</button>
                        </div>`;
                    });
                    html += `</div>`;
                });
                html += `</div>`;
            });
            container.innerHTML = html;
        }

        function removeAutoAssignItem(idx) {
            if (!autoAssignPreview) return;
            autoAssignPreview = autoAssignPreview.filter((_, i) => i !== idx);
            renderAutoAssignPreview();
        }

        function applyAutoAssign() {
            const proposed = autoAssignPreview || [];
            if (proposed.length === 0) { closeAutoAssignModal(); return; }
            pushAssignmentUndoState();
            proposed.forEach(p => {
                // Re-check the slot is still empty (safety) before assigning
                const stillEmpty = !assignments.some(a => a.date === p.date && a.type === p.type);
                if (stillEmpty) {
                    assignments.push({ id: `assignment-${Date.now()}-${Math.random()}`, date: p.date, type: p.type, brotherId: p.brotherId });
                }
            });
            saveData();
            autoAssignPreview = null;
            closeAutoAssignModal();
            render();
            alert(`Applied ${proposed.length} assignment(s). Puwede mong i-undo gamit ang ↩ Undo Last.`);
        }

        function closeAutoAssignModal() {
            document.getElementById('autoAssignModal').classList.add('hidden');
            document.body.classList.remove('modal-open');
        }

        function clearAssignmentsForSelectedMonth() {
            const monthStr = document.getElementById('monthSelect')?.value;
            if (!monthStr) {
                alert('Please select a month first.');
                return;
            }

            const [year, month] = monthStr.split('-').map(Number);
            const monthKey = `${year}-${String(month).padStart(2, '0')}`;

            if (!confirm(`Clear all assignments for ${monthStr}?`)) return;

            pushAssignmentUndoState();

            const assignmentsBefore = assignments.length;
            const sundayAssignmentsBefore = sundayAssignments.length;
            assignments = assignments.filter(a => !a.date.startsWith(monthKey));
            sundayAssignments = sundayAssignments.filter(a => !a.date.startsWith(monthKey));

            saveData();
            render();

            const removedCount = (assignmentsBefore - assignments.length) + (sundayAssignmentsBefore - sundayAssignments.length);
            alert(`Cleared ${removedCount} assignment(s) for ${monthStr}.`);
        }

        // Populate assignment type dropdown for grid view
        function populateGridTypeDropdown() {
            const select = document.getElementById('gridAssignmentType');
            if (!select) return;
            const currentValue = select.value;
            select.innerHTML = '';
            ASSIGNMENT_TYPES.forEach((type, idx) => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                select.appendChild(option);
            });
            if (currentValue && ASSIGNMENT_TYPES.includes(currentValue)) {
                select.value = currentValue;
            }
        }

        // Get all Thursdays for the visible month range (grouped by week-start month)
        function getThursdaysForYear() {
            const monthStr = document.getElementById('monthSelect').value;
            const [selectedYear] = monthStr.split('-').map(Number);
            const startMonth = gridStartMonth;
            const endMonth = Math.min(gridStartMonth + GRID_MONTH_COUNT - 1, 12);
            const allThursdays = {};
            
            for (let month = startMonth; month <= endMonth; month++) {
                allThursdays[month] = getThursdaysForMonthByWeekStart(selectedYear, month);
            }
            return allThursdays;
        }

        // Render Assignments Grid View
        function updateGridSearch() {
            gridSearchTerm = (document.getElementById('gridSearchInput')?.value || '').toLowerCase().trim();
            renderGrid();
        }

        function renderGrid() {
            const container = document.getElementById('gridContainer');
            if (!container) return;

            const selectedType = document.getElementById('gridAssignmentType')?.value || ASSIGNMENT_TYPES[0];
            const thursdaysByMonth = getThursdaysForYear();
            const monthStr = document.getElementById('monthSelect').value;
            const [selectedYear] = monthStr.split('-').map(Number);
            const startMonth = gridStartMonth;
            const endMonth = Math.min(gridStartMonth + GRID_MONTH_COUNT - 1, 12);
            const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

            if (brothers.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-center py-8">No brothers yet. Import names in Brothers View first.</p>';
                return;
            }

            // Calculate max weeks per month for colspan
            let maxWeeks = {};
            for (let m = startMonth; m <= endMonth; m++) {
                maxWeeks[m] = thursdaysByMonth[m].length;
            }

            let html = '<table class="grid-table">';
            
            // Header row 1: Month names
            html += '<thead><tr><th class="name-cell" rowspan="2">Name</th>';
            for (let m = startMonth; m <= endMonth; m++) {
                if (maxWeeks[m] > 0) {
                    html += `<th class="month-header" colspan="${maxWeeks[m]}">${monthNames[m]}</th>`;
                }
            }
            html += '</tr>';

            // Header row 2: Week numbers (dates)
            html += '<tr>';
            const selectedTypeIndex = ASSIGNMENT_TYPES.indexOf(selectedType);
            for (let m = startMonth; m <= endMonth; m++) {
                thursdaysByMonth[m].forEach((dateStr, idx) => {
                    const day = parseInt(dateStr.split('-')[2]);
                    // Check if this week has an assignment for the selected type
                    const hasAssignment = assignments.filter(a => a.date === dateStr && a.type === selectedType).length > 0;
                    const weekClass = hasAssignment ? `week-type-${selectedTypeIndex}` : '';
                    html += `<th class="${weekClass}" title="${dateStr}${hasAssignment ? ' ✓ Assigned' : ''}">${day}</th>`;
                });
            }
            html += '</tr></thead>';

            // Collect all Thursdays in order for trail calculation and badge counts
            const allThursdaysList = [];
            for (let m = startMonth; m <= endMonth; m++) {
                thursdaysByMonth[m].forEach(d => allThursdaysList.push(d));
            }
            const visibleDatesSet = new Set(allThursdaysList);

            // Get current date for comparison
            const manilaStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
            const phTime = new Date(manilaStr);
            const todayStr = `${phTime.getFullYear()}-${String(phTime.getMonth() + 1).padStart(2, '0')}-${String(phTime.getDate()).padStart(2, '0')}`;

            // Body: one row per brother
            const sortedBrothers = [...brothers].sort((a, b) => {
                const aCategory = getBrotherCategory(a);
                const bCategory = getBrotherCategory(b);
                const aOrder = BROTHER_CATEGORIES.indexOf(aCategory);
                const bOrder = BROTHER_CATEGORIES.indexOf(bCategory);

                if (aOrder !== bOrder) return aOrder - bOrder;
                return a.name.localeCompare(b.name);
            });

            const filteredBrothers = gridSearchTerm
                ? sortedBrothers.filter(b => b.name.toLowerCase().includes(gridSearchTerm))
                : sortedBrothers;

            html += '<tbody>';
            filteredBrothers.forEach((brother, rowIdx) => {
                const rowClass = getBrotherRowClass(brother, rowIdx);
                
                // Find the LAST assignment date for this brother FOR THE SELECTED TYPE ONLY
                const brotherTypeAssignments = assignments.filter(a => 
                    a.brotherId === brother.id && a.type === selectedType
                );
                let lastTypeAssignmentDate = null;
                if (brotherTypeAssignments.length > 0) {
                    lastTypeAssignmentDate = brotherTypeAssignments
                        .map(a => a.date)
                        .sort()
                        .reverse()[0]; // Get the most recent date for this type
                }

                const visibleTypeAssignmentsCount = assignments.filter(a => 
                    a.brotherId === brother.id &&
                    a.type === selectedType &&
                    visibleDatesSet.has(a.date)
                ).length;
                const countBadge = visibleTypeAssignmentsCount > 0 ? `<span class="ml-2 inline-flex items-center rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-gray-700">${visibleTypeAssignmentsCount}</span>` : '';
                html += `<tr><td class="name-cell ${rowClass}">${brother.name}${countBadge}</td>`;
                
                for (let m = startMonth; m <= endMonth; m++) {
                    thursdaysByMonth[m].forEach(dateStr => {
                        // Find ANY assignment for this brother on this date
                        const assignmentOnDate = assignments.find(a => 
                            a.date === dateStr && 
                            a.brotherId === brother.id
                        );
                        
                        let cellClass = '';
                        let trailInfo = '';
                        
                        // Check if brother has a Sunday assignment for this week
                        const hasSunday = hasSundayAssignment(brother.id, dateStr);
                        const sundayClass = hasSunday ? 'sunday-indicator' : '';
                        const sundayInfo = hasSunday ? ' - ☀️ Has Sunday Assignment' : '';
                        
                        if (assignmentOnDate) {
                            // Get the type index for color
                            const typeIndex = ASSIGNMENT_TYPES.indexOf(assignmentOnDate.type);
                            cellClass = `type-${typeIndex}`;
                        } else {
                            // Show trailing color FROM January 1 TO the latest assignment for this type
                            // Trail extends to future dates (for advance assignments)
                            // This helps identify who has the least assignments for this type:
                            // - Long trail = assigned far into future = low priority
                            // - Short trail = last assignment was early = needs assignment soon
                            // - No trail (white) = never assigned this type = HIGH priority
                            
                            if (lastTypeAssignmentDate !== null && dateStr <= lastTypeAssignmentDate) {
                                // Show trail FROM start UP TO the last assignment date (including future)
                                cellClass = `trail-type-${selectedTypeIndex}`;
                                trailInfo = ` (${selectedType} trail → last: ${lastTypeAssignmentDate})`;
                            }
                            // Dates AFTER last assignment or never assigned = no trail (white) - easy to identify
                        }
                        
                        html += `<td class="week-cell ${cellClass} ${sundayClass}" 
                            onclick="toggleGridAssignment('${dateStr}', '${selectedType}', '${brother.id}')" 
                            title="${brother.name} - ${dateStr}${assignmentOnDate ? ' (' + assignmentOnDate.type + ')' : trailInfo}${sundayInfo}"></td>`;
                    });
                }
                html += '</tr>';
            });
            html += '</tbody></table>';

            container.innerHTML = html;
        }

        // Toggle assignment from grid cell click
        function toggleGridAssignment(date, type, brotherId) {
            pushAssignmentUndoState();
            const existingIndex = assignments.findIndex(a => 
                a.date === date && a.type === type && a.brotherId === brotherId
            );

            if (existingIndex >= 0) {
                // Remove assignment
                assignments.splice(existingIndex, 1);
            } else {
                // Check monthly limit
                const [year, month] = date.split('-');
                const monthKey = `${year}-${month}`;
                const monthCount = assignments.filter(a => a.brotherId === brotherId && a.date.startsWith(monthKey)).length;

                if (monthCount >= 3) {
                    alert('Cannot assign - this brother already has 3 assignments this month.');
                    return;
                }

                // For non-Pamumuhay types, remove existing assignment for that slot first
                if (type !== 'Pamumuhay') {
                    const existingSlot = assignments.findIndex(a => a.date === date && a.type === type);
                    if (existingSlot >= 0) {
                        assignments.splice(existingSlot, 1);
                    }
                }

                // Add new assignment
                assignments.push({
                    id: `assignment-${Date.now()}-${Math.random()}`,
                    date,
                    type,
                    brotherId
                });
            }

            saveData();
            renderGrid();
        }


        function handleSundaySelect(event, thursday) {
            const brotherId = event.target.value;
            if (brotherId) {
                toggleSundayAssignment(brotherId, thursday);
                event.target.value = '';
            }
        }


        // Show brother details modal


        // Export data to JSON file
        // ==================== BACKUP FOLDER SAVE (File System Access API) ====================
        // Persists a chosen directory handle in IndexedDB so exports go straight to the
        // user's backups folder after a one-time pick. Falls back to a normal download
        // when the API is unavailable (file://, Firefox, Safari) or the user cancels.
        function idbOpen() {
            return new Promise((resolve, reject) => {
                const req = indexedDB.open('atk_fs', 1);
                req.onupgradeneeded = () => { req.result.createObjectStore('handles'); };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        }
        async function idbGetHandle() {
            try {
                const db = await idbOpen();
                return await new Promise((resolve) => {
                    const tx = db.transaction('handles', 'readonly');
                    const r = tx.objectStore('handles').get('backupDir');
                    r.onsuccess = () => resolve(r.result || null);
                    r.onerror = () => resolve(null);
                });
            } catch (e) { return null; }
        }
        async function idbSetHandle(handle) {
            try {
                const db = await idbOpen();
                const tx = db.transaction('handles', 'readwrite');
                tx.objectStore('handles').put(handle, 'backupDir');
            } catch (e) { /* ignore */ }
        }

        function downloadBlobFallback(filename, blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        async function saveToBackups(filename, blob) {
            // Fallback path when the API is not available (e.g. file://, unsupported browser)
            if (!window.showDirectoryPicker) {
                downloadBlobFallback(filename, blob);
                return 'download';
            }
            try {
                let dir = await idbGetHandle();
                // Verify/request permission on the stored handle
                if (dir) {
                    const perm = await dir.queryPermission({ mode: 'readwrite' });
                    if (perm !== 'granted') {
                        const req = await dir.requestPermission({ mode: 'readwrite' });
                        if (req !== 'granted') dir = null;
                    }
                }
                // First time (or permission lost): ask the user to pick the backups folder once
                if (!dir) {
                    dir = await window.showDirectoryPicker({ id: 'atkBackups', mode: 'readwrite' });
                    await idbSetHandle(dir);
                }
                const fileHandle = await dir.getFileHandle(filename, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                return 'folder';
            } catch (e) {
                // User cancelled the picker, or a write error — fall back to normal download
                if (e && e.name === 'AbortError') { downloadBlobFallback(filename, blob); return 'download'; }
                downloadBlobFallback(filename, blob);
                return 'download';
            }
        }

        async function exportData() {
            const data = {
                exportDate: new Date().toISOString(),
                version: '1.0',
                brothers: brothers,
                assignments: assignments,
                sundayAssignments: sundayAssignments,
                brotherEligibility: brotherEligibility
            };
            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const dateStr = new Date().toISOString().slice(0, 10);
            const where = await saveToBackups(`assignment-tracker-backup-${dateStr}.json`, blob);
            localStorage.setItem('atk_lastBackup', new Date().toISOString());
            const _br = document.getElementById('backupReminder'); if (_br) _br.classList.add('hidden');
            alert(where === 'folder' ? 'Data saved to your backups folder!' : 'Data exported successfully! The file has been downloaded.');
        }

        // Export to Excel with colored grids and separate sheets per category
        async function exportToExcel() {
            if (typeof XLSX === 'undefined') {
                alert('Excel library not loaded. Please check your internet connection and refresh the page.');
                return;
            }

            // Color mapping for each assignment type (Excel hex colors without #)
            const typeColors = {
                'Opening Prayer': { bg: 'FECACA', header: 'EF4444' },
                'OCLM Chairman': { bg: 'FED7AA', header: 'F97316' },
                '10 mins talk': { bg: 'FEF08A', header: 'EAB308' },
                'Espiritual na Hiyas': { bg: 'BBF7D0', header: '22C55E' },
                'Auxiliary Class Chairman': { bg: '99F6E4', header: '14B8A6' },
                'Pamumuhay': { bg: 'BFDBFE', header: '3B82F6' },
                'CBS': { bg: 'C7D2FE', header: '6366F1' },
                'CBS Reader': { bg: 'DDD6FE', header: '8B5CF6' },
                'Closing prayer': { bg: 'FBCFE8', header: 'EC4899' }
            };

            // Get all weeks from assignments (sorted)
            const allWeeks = [...new Set(assignments.map(a => a.date))].sort();
            if (allWeeks.length === 0) {
                alert('No assignments to export yet.');
                return;
            }

            // Group weeks by month for column headers
            const weeksByMonth = {};
            allWeeks.forEach(week => {
                const [year, month] = week.split('-');
                const monthKey = `${year}-${month}`;
                if (!weeksByMonth[monthKey]) weeksByMonth[monthKey] = [];
                weeksByMonth[monthKey].push(week);
            });

            // Create workbook
            const wb = XLSX.utils.book_new();

            // Helper: create cell with style
            function styledCell(value, bgColor, fontColor = '000000', bold = false) {
                return {
                    v: value,
                    t: 's',
                    s: {
                        fill: { fgColor: { rgb: bgColor } },
                        font: { color: { rgb: fontColor }, bold: bold },
                        alignment: { horizontal: 'center', vertical: 'center' },
                        border: {
                            top: { style: 'thin', color: { rgb: 'D1D5DB' } },
                            bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
                            left: { style: 'thin', color: { rgb: 'D1D5DB' } },
                            right: { style: 'thin', color: { rgb: 'D1D5DB' } }
                        }
                    }
                };
            }

            // Create sheet for each assignment type
            ASSIGNMENT_TYPES.forEach(type => {
                const typeAssignments = assignments.filter(a => a.type === type);
                const colors = typeColors[type] || { bg: 'F3F4F6', header: '374151' };
                
                // Lighter trail colors per type (for cells before the last assignment)
                const trailColors = {
                    'Opening Prayer': 'FEF2F2',
                    'OCLM Chairman': 'FFF7ED',
                    '10 mins talk': 'FEFCE8',
                    'Espiritual na Hiyas': 'F0FDF4',
                    'Auxiliary Class Chairman': 'F0FDFA',
                    'Pamumuhay': 'EFF6FF',
                    'CBS': 'EEF2FF',
                    'CBS Reader': 'F5F3FF',
                    'Closing prayer': 'FDF2F8'
                };
                const trailBg = trailColors[type] || 'F9FAFB';


                let sheetBrothers = brothers.filter(b => isSelectableForAssignment(b) && brotherEligibility[b.id]?.[type] !== false);

                // Build data array
                const data = [];
                
                // Header row 1: Assignment Type Title
                data.push([styledCell(type, colors.header, 'FFFFFF', true)]);
                
                // Header row 2: Month headers spanning multiple columns
                const monthRow = [styledCell('Brother', '1E3A5F', 'FFFFFF', true)];
                Object.keys(weeksByMonth).sort().forEach(monthKey => {
                    const [year, month] = monthKey.split('-');
                    const monthName = new Date(year, parseInt(month) - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
                    const weeks = weeksByMonth[monthKey];
                    // Add month name for first week, empty for rest
                    weeks.forEach((_, i) => {
                        monthRow.push(styledCell(i === 0 ? monthName : '', '2563EB', 'FFFFFF', true));
                    });
                });
                data.push(monthRow);
                
                // Header row 3: Week dates
                const weekRow = [styledCell('', '1E3A5F', 'FFFFFF', true)];
                allWeeks.forEach(week => {
                    const [, , day] = week.split('-');
                    weekRow.push(styledCell(day, '1E3A5F', 'FFFFFF', true));
                });
                data.push(weekRow);
                
                // Data rows: one per brother
                const sortedBrothers = [...sheetBrothers].sort((a, b) => a.name.localeCompare(b.name));
                sortedBrothers.forEach((brother, idx) => {
                    const row = [];
                    const rowBg = idx % 2 === 0 ? 'FFFFFF' : 'F9FAFB';
                    
                    // Brother name
                    row.push(styledCell(brother.name, rowBg, '111827', true));
                    
                    // Find last assignment date for this brother & type (for trail)
                    const brotherTypeAssignments = typeAssignments.filter(a => a.brotherId === brother.id);
                    let lastAssignmentDate = null;
                    if (brotherTypeAssignments.length > 0) {
                        lastAssignmentDate = brotherTypeAssignments.map(a => a.date).sort().reverse()[0];
                    }

                    // Check each week
                    allWeeks.forEach(week => {
                        const hasAssignment = brotherTypeAssignments.some(a => a.date === week);
                        
                        if (hasAssignment) {
                            row.push(styledCell('✓', colors.bg, '000000', true));
                        } else if (lastAssignmentDate && week <= lastAssignmentDate) {
                            // Trail: lighter color for weeks before the last assignment
                            row.push(styledCell('', trailBg, '000000', false));
                        } else {
                            row.push(styledCell('', rowBg, '000000', false));
                        }
                    });
                    
                    data.push(row);
                });
                
                // Create worksheet
                const ws = XLSX.utils.aoa_to_sheet(data);
                
                // Set column widths
                const colWidths = [{ wch: 25 }]; // Brother name column
                allWeeks.forEach(() => colWidths.push({ wch: 5 })); // Week columns
                ws['!cols'] = colWidths;
                
                // Add sheet to workbook (sheet name limited to 31 chars)
                const sheetName = type.length > 31 ? type.substring(0, 31) : type;
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });

            // Create Summary sheet
            const summaryData = [];
            summaryData.push([styledCell('Assignment Summary', '1E3A5F', 'FFFFFF', true)]);
            summaryData.push([styledCell('', 'FFFFFF')]);
            
            // Header
            const summaryHeader = [styledCell('Brother', '374151', 'FFFFFF', true)];
            ASSIGNMENT_TYPES.forEach(type => {
                const colors = typeColors[type] || { bg: 'F3F4F6', header: '374151' };
                summaryHeader.push(styledCell(type, colors.header, 'FFFFFF', true));
            });
            summaryHeader.push(styledCell('Total', '1E3A5F', 'FFFFFF', true));
            summaryData.push(summaryHeader);
            
            // Brother rows
            const sortedBrothers = [...brothers].sort((a, b) => a.name.localeCompare(b.name));
            sortedBrothers.forEach((brother, idx) => {
                const row = [];
                const rowBg = idx % 2 === 0 ? 'FFFFFF' : 'F9FAFB';
                row.push(styledCell(brother.name, rowBg, '111827', true));
                
                let total = 0;
                ASSIGNMENT_TYPES.forEach(type => {
                    const colors = typeColors[type] || { bg: 'F3F4F6', header: '374151' };
                    const count = assignments.filter(a => 
                        a.brotherId === brother.id && a.type === type
                    ).length;
                    total += count;
                    row.push(styledCell(count > 0 ? count.toString() : '', count > 0 ? colors.bg : rowBg, '000000', count > 0));
                });
                row.push(styledCell(total.toString(), 'E0E7FF', '1E3A5F', true));
                
                summaryData.push(row);
            });
            
            const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
            const summaryColWidths = [{ wch: 25 }];
            ASSIGNMENT_TYPES.forEach(() => summaryColWidths.push({ wch: 12 }));
            summaryColWidths.push({ wch: 8 });
            summaryWs['!cols'] = summaryColWidths;
            
            // Insert Summary as first sheet
            XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
            
            // Reorder sheets to put Summary first
            const sheetOrder = ['Summary', ...ASSIGNMENT_TYPES.map(t => t.length > 31 ? t.substring(0, 31) : t)];
            wb.SheetNames = sheetOrder.filter(name => wb.SheetNames.includes(name));

            // Export
            const dateStr = new Date().toISOString().slice(0, 10);
            const wbArray = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
            const xlsxBlob = new Blob([wbArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const whereXlsx = await saveToBackups(`assignment-tracker-${dateStr}.xlsx`, xlsxBlob);
            
            alert(whereXlsx === 'folder' ? 'Excel saved to your backups folder!' : 'Excel file exported successfully!');
        }

        // Import data from JSON file
        function importDataFromFile(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    // Validate the imported data structure
                    if (!data.brothers || !Array.isArray(data.brothers)) {
                        throw new Error('Invalid file format: missing brothers data');
                    }
                    if (!data.assignments || !Array.isArray(data.assignments)) {
                        throw new Error('Invalid file format: missing assignments data');
                    }
                    
                    // Confirm before overwriting
                    const existingCount = brothers.length;
                    const importCount = data.brothers.length;
                    const assignmentCount = data.assignments.length;
                    
                    const confirmMsg = `This will replace all current data:\n\n` +
                        `Current: ${existingCount} brothers, ${assignments.length} assignments\n` +
                        `Import: ${importCount} brothers, ${assignmentCount} assignments\n\n` +
                        `Continue?`;
                    
                    if (!confirm(confirmMsg)) {
                        event.target.value = ''; // Reset file input
                        return;
                    }
                    
                    // Import the data
                    brothers = data.brothers || [];
                    assignments = data.assignments || [];
                    sundayAssignments = data.sundayAssignments || [];
                    brotherEligibility = data.brotherEligibility || {};
                    
                    // Ensure eligibility is set for all brothers
                    brothers.forEach(brother => {
                        if (!brotherEligibility[brother.id]) {
                            brotherEligibility[brother.id] = {};
                            ASSIGNMENT_TYPES.forEach(type => {
                                brotherEligibility[brother.id][type] = true;
                            });
                        }
                    });
                    
                    saveData();
                    render();
                    
                    alert(`Import successful!\n\nImported ${importCount} brothers and ${assignmentCount} assignments.`);
                } catch (error) {
                    alert('Error importing data: ' + error.message);
                }
            };
            
            reader.onerror = function() {
                alert('Error reading file. Please try again.');
            };
            
            reader.readAsText(file);
            event.target.value = ''; // Reset file input for future imports
        }

        // PDF Modal functions


        // Export to PDF with 4-grid layout (one per week)

        // ==================== SUNDAY VIEW ====================
        function renderSundayView() {
            const container = document.getElementById('sundayContent');
            if (!container) return;
            
            const monthStr = document.getElementById('monthSelect').value;
            const [year, month] = monthStr.split('-').map(Number);
            
            // Get Thursdays belonging to this month by week-start (Monday)
            const thursdays = getThursdaysForMonthByWeekStart(year, month);
            
            let html = '<div class="space-y-6">';
            thursdays.forEach((thursday, idx) => {
                const sundayDate = getSundayForThursday(thursday);
                const sundayFormatted = new Date(sundayDate + 'T12:00:00+08:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                
                // Get brothers with Sunday assignment for this week
                const sundayBrothers = sundayAssignments.filter(sa => sa.date === sundayDate);
                
                html += `<div class="border rounded-lg p-4">
                    <h3 class="font-bold text-lg mb-3">Week ${idx + 1} - Sunday: ${sundayFormatted}</h3>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2">`;
                
                brothers.sort((a, b) => a.name.localeCompare(b.name)).forEach(brother => {
                    const hasSunday = sundayBrothers.some(sb => sb.brotherId === brother.id);
                    html += `<label class="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-100 ${hasSunday ? 'bg-yellow-100' : ''}">
                        <input type="checkbox" ${hasSunday ? 'checked' : ''} 
                            onchange="toggleSundayAssignment('${brother.id}', '${thursday}')"
                            class="w-4 h-4">
                        <span class="text-sm">${brother.name}</span>
                    </label>`;
                });
                
                html += `</div></div>`;
            });
            html += '</div>';
            
            container.innerHTML = html;
        }

        // ==================== PDF EDITOR ====================
        function getAssignedBrother(date, type) {
            const assignment = assignments.find(a => a.date === date && a.type === type);
            if (assignment) {
                const brother = brothers.find(b => b.id === assignment.brotherId);
                return brother ? brother.name : '';
            }
            return '';
        }

        // Get all assigned brothers for a type (useful for Pamumuhay which can have 2)
        function getAssignedBrothers(date, type) {
            const typeAssignments = assignments.filter(a => a.date === date && a.type === type);
            return typeAssignments.map(a => {
                const brother = brothers.find(b => b.id === a.brotherId);
                return brother ? brother.name : '—';
            });
        }

        function getMeetingEditorKey(weekDate) {
            return `week_${weekDate}`;
        }

        function saveMeetingEditorData() {
            localStorage.setItem('atk_meetingEditorData', JSON.stringify(meetingEditorData));
        }

        function loadMeetingEditorData() {
            const saved = localStorage.getItem('atk_meetingEditorData');
            if (saved) {
                meetingEditorData = JSON.parse(saved);
            }
        }

        function updateMeetingField(weekDate, field, value) {
            const key = getMeetingEditorKey(weekDate);
            if (!meetingEditorData[key]) meetingEditorData[key] = {};
            meetingEditorData[key][field] = value;
            saveMeetingEditorData();
        }

        function getMeetingField(weekDate, field, defaultValue = '') {
            const key = getMeetingEditorKey(weekDate);
            return meetingEditorData[key]?.[field] || defaultValue;
        }

        function addMinistryPart(weekDate) {
            const key = getMeetingEditorKey(weekDate);
            if (!meetingEditorData[key]) meetingEditorData[key] = {};
            if (!meetingEditorData[key].ministryParts) meetingEditorData[key].ministryParts = [];
            meetingEditorData[key].ministryParts.push({ title: '', name: '', assistant: '' });
            saveMeetingEditorData();
            renderPdfEditor();
        }

        function removeMinistryPart(weekDate, index) {
            const key = getMeetingEditorKey(weekDate);
            if (meetingEditorData[key]?.ministryParts) {
                meetingEditorData[key].ministryParts.splice(index, 1);
                saveMeetingEditorData();
                renderPdfEditor();
            }
        }

        function updateMinistryPart(weekDate, index, field, value) {
            const key = getMeetingEditorKey(weekDate);
            if (!meetingEditorData[key]) meetingEditorData[key] = {};
            if (!meetingEditorData[key].ministryParts) meetingEditorData[key].ministryParts = [];
            if (!meetingEditorData[key].ministryParts[index]) meetingEditorData[key].ministryParts[index] = {};
            meetingEditorData[key].ministryParts[index][field] = value;
            saveMeetingEditorData();
        }

        function addLivingPart(weekDate) {
            const key = getMeetingEditorKey(weekDate);
            if (!meetingEditorData[key]) meetingEditorData[key] = {};
            if (!meetingEditorData[key].livingParts) meetingEditorData[key].livingParts = [];
            meetingEditorData[key].livingParts.push({ title: '', name: '' });
            saveMeetingEditorData();
            renderPdfEditor();
        }

        function removeLivingPart(weekDate, index) {
            const key = getMeetingEditorKey(weekDate);
            if (meetingEditorData[key]?.livingParts) {
                meetingEditorData[key].livingParts.splice(index, 1);
                saveMeetingEditorData();
                renderPdfEditor();
            }
        }

        function updateLivingPart(weekDate, index, field, value) {
            const key = getMeetingEditorKey(weekDate);
            if (!meetingEditorData[key]) meetingEditorData[key] = {};
            if (!meetingEditorData[key].livingParts) meetingEditorData[key].livingParts = [];
            if (!meetingEditorData[key].livingParts[index]) meetingEditorData[key].livingParts[index] = {};
            meetingEditorData[key].livingParts[index][field] = value;
            saveMeetingEditorData();
        }

        // Auto-resize textarea to fit content
        function autoResizeTextarea(el) {
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
        }

        // Escape HTML for textarea content (newlines are kept as-is inside textarea)
        function escNewlines(str) {
            return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }

        function renderPdfEditor() {
            loadMeetingEditorData();

            const monthStr = document.getElementById('monthSelect').value;
            const [year, month] = monthStr.split('-').map(Number);
            const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const monthNamesShort = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            document.getElementById('pdfMonthYearLabel').textContent = `${monthNames[month]} ${year}`;

            const thursdays = getThursdaysForMonthByWeekStart(year, month);
            const container = document.getElementById('meetingWeeksContainer');
            let html = '';

            // em-dash placeholder for unassigned names
            const EM = '<em style="color:#999;">—</em>';

            thursdays.forEach((thursday, weekIdx) => {
                const thursdayDate = new Date(thursday + 'T12:00:00+08:00');
                const weekStart = new Date(thursdayDate); weekStart.setDate(thursdayDate.getDate() - 3);
                const weekEnd = new Date(thursdayDate); weekEnd.setDate(thursdayDate.getDate() + 3);
                const startDay = weekStart.getDate(), endDay = weekEnd.getDate();
                const startMonth = weekStart.getMonth() + 1, endMonth = weekEnd.getMonth() + 1;
                const dateRange = startMonth === endMonth
                    ? `${monthNamesShort[startMonth]} ${startDay}-${endDay}`
                    : `${monthNamesShort[startMonth]} ${startDay} – ${monthNamesShort[endMonth]} ${endDay}`;

                const openingPrayer = getAssignedBrother(thursday, 'Opening Prayer');
                const chairman = getAssignedBrother(thursday, 'OCLM Chairman');
                const tenMinTalk = getAssignedBrother(thursday, '10 mins talk');
                const espirituwalHiyas = getAssignedBrother(thursday, 'Espiritual na Hiyas');
                const auxiliaryClass = getAssignedBrother(thursday, 'Auxiliary Class Chairman');
                const pamumuhayBrothers = getAssignedBrothers(thursday, 'Pamumuhay');
                const cbs = getAssignedBrother(thursday, 'CBS');
                const cbsReader = getAssignedBrother(thursday, 'CBS Reader');
                const closingPrayer = getAssignedBrother(thursday, 'Closing prayer');

                const key = getMeetingEditorKey(thursday);
                const ministryParts = meetingEditorData[key]?.ministryParts || [
                    { title: '', name: '', assistant: '' },
                    { title: '', name: '', assistant: '' },
                    { title: '', name: '', assistant: '' }
                ];
                const livingParts = meetingEditorData[key]?.livingParts || [];
                const hasAux = (new Date(thursday + 'T12:00:00+08:00').getMonth() + 1) >= AUXILIARY_START_MONTH;

                // small helper: name + optional assistant, joined with &
                function nameAmp(name, assistant) {
                    const n = name || EM;
                    return assistant ? `${n} <span class="amp">&</span> ${assistant}` : n;
                }

                // ---- LEFT COLUMN: Kayamanan + (Awit) + Pamumuhay ----
                let left = '';
                left += `<div class="meeting-colsection-header mc-treasures">KAYAMANAN MULA SA SALITA NG DIYOS</div>`;
                // Part 1 (10 min talk)
                left += `<div class="meeting-part">
                    <span class="meeting-part-number treasures">1.</span>
                    <span class="meeting-part-title treasures">
                        <textarea class="pdf-editor-input" style="width:90%;color:#0d9488;" rows="1" oninput="autoResizeTextarea(this)"
                            onchange="updateMeetingField('${thursday}', 'part1Title', this.value)"
                            placeholder="Part title (10 min.)">${escNewlines(getMeetingField(thursday, 'part1Title', ''))}</textarea>
                    </span>
                    <span class="meeting-part-name">${tenMinTalk || EM}</span>
                </div>`;
                // Part 2 Espiritwal
                left += `<div class="meeting-part">
                    <span class="meeting-part-number treasures">2.</span>
                    <span class="meeting-part-title treasures">Espirituwal na Hiyas <span class="meeting-part-minutes">(10 min.)</span></span>
                    <span class="meeting-part-name">${espirituwalHiyas || EM}</span>
                </div>`;
                // Part 3 Pagbabasa
                left += `<div class="meeting-part">
                    <span class="meeting-part-number treasures">3.</span>
                    <span class="meeting-part-title treasures">Pagbabasa ng Bibliya <span class="meeting-part-minutes">(4 min.)</span></span>
                    <span class="meeting-part-name"><input type="text" class="pdf-editor-name" value="${getMeetingField(thursday, 'bibleReadingName', '')}"
                        onchange="updateMeetingField('${thursday}', 'bibleReadingName', this.value)" placeholder="Name"></span>
                </div>`;
                // Awit (middle song) + PAMUMUHAY header
                left += `<div class="meeting-awit-inline">Awit: <input type="text" class="pdf-editor-input" style="width:36px;display:inline-block;"
                        value="${getMeetingField(thursday, 'middleSong', '')}" onchange="updateMeetingField('${thursday}', 'middleSong', this.value)"></div>`;
                left += `<div class="meeting-colsection-header mc-living">PAMUMUHAY BILANG KRISTIYANO</div>`;
                // Pamumuhay parts (assigned brothers), numbering continues after ministry
                const pamStart = 4 + ministryParts.length;
                if (pamumuhayBrothers.length > 0) {
                    pamumuhayBrothers.forEach((bn, i) => {
                        left += `<div class="meeting-part">
                            <span class="meeting-part-number living">${pamStart + i}.</span>
                            <span class="meeting-part-title">
                                <textarea class="pdf-editor-input" style="width:85%;" rows="1" oninput="autoResizeTextarea(this)"
                                    onchange="updateMeetingField('${thursday}', 'pamumuhayTitle${i}', this.value)"
                                    placeholder="Pamumuhay">${escNewlines(getMeetingField(thursday, 'pamumuhayTitle' + i, 'Pamumuhay'))}</textarea>
                            </span>
                            <span class="meeting-part-name">${bn || EM}</span>
                        </div>`;
                    });
                } else {
                    left += `<div class="meeting-part">
                        <span class="meeting-part-number living">${pamStart}.</span>
                        <span class="meeting-part-title">
                            <textarea class="pdf-editor-input" style="width:85%;" rows="1" oninput="autoResizeTextarea(this)"
                                onchange="updateMeetingField('${thursday}', 'pamumuhayTitle0', this.value)"
                                placeholder="Pamumuhay">${escNewlines(getMeetingField(thursday, 'pamumuhayTitle0', 'Pamumuhay'))}</textarea>
                        </span>
                        <span class="meeting-part-name"><em style="color:#999;">— (assign)</em></span>
                    </div>`;
                }
                // extra living parts
                const livingStart = pamStart + Math.max(pamumuhayBrothers.length, 1);
                livingParts.forEach((part, i) => {
                    left += `<div class="meeting-part">
                        <span class="meeting-part-number living">${livingStart + i}.</span>
                        <span class="meeting-part-title">
                            <textarea class="pdf-editor-input" style="width:85%;" rows="1" oninput="autoResizeTextarea(this)"
                                onchange="updateLivingPart('${thursday}', ${i}, 'title', this.value)"
                                placeholder="">${escNewlines(part.title || '')}</textarea>
                        </span>
                        <span class="meeting-part-name">
                            <input type="text" class="pdf-editor-name" value="${part.name || ''}"
                                onchange="updateLivingPart('${thursday}', ${i}, 'name', this.value)" placeholder="">
                            <span class="remove-part-btn" onclick="removeLivingPart('${thursday}', ${i})">✕</span>
                        </span>
                    </div>`;
                });
                left += `<div class="add-part-btn" onclick="addLivingPart('${thursday}')">+ Add Living Part</div>`;
                // CBS + Par. Reader
                const cbsNum = livingStart + livingParts.length;
                left += `<div class="meeting-part">
                    <span class="meeting-part-number living">${cbsNum}.</span>
                    <span class="meeting-part-title">Pag-aaral ng Kongregasyon sa Bibliya <span class="meeting-part-minutes">(30 min.)</span></span>
                    <span class="meeting-part-name">${cbs || EM}</span>
                </div>`;
                left += `<div class="meeting-part">
                    <span class="meeting-part-title"><strong>Par. Reader:</strong> ${cbsReader || EM}</span>
                </div>`;

                // ---- RIGHT COLUMN: Maging Mahusay + Auxiliary ----
                let right = '';
                right += `<div class="meeting-colsection-header mc-ministry">MAGING MAHUSAY SA MINISTERYO</div>`;
                right += ministryParts.map((part, i) => `
                    <div class="meeting-part">
                        <span class="meeting-part-number ministry">${4 + i}.</span>
                        <span class="meeting-part-title">
                            <textarea class="pdf-editor-input" style="width:85%;" rows="1" oninput="autoResizeTextarea(this)"
                                onchange="updateMinistryPart('${thursday}', ${i}, 'title', this.value)"
                                placeholder="">${escNewlines(part.title || '')}</textarea>
                        </span>
                        <span class="meeting-part-name meeting-part-pair">
                            <input type="text" class="pdf-editor-name" style="min-width:70px;" value="${part.name || ''}"
                                onchange="updateMinistryPart('${thursday}', ${i}, 'name', this.value)" placeholder="Name">
                            <span class="amp">&</span>
                            <input type="text" class="pdf-editor-name" style="min-width:70px;" value="${part.assistant || ''}"
                                onchange="updateMinistryPart('${thursday}', ${i}, 'assistant', this.value)" placeholder="Assistant">
                            ${ministryParts.length > 1 ? `<span class="remove-part-btn" onclick="removeMinistryPart('${thursday}', ${i})">✕</span>` : ''}
                        </span>
                    </div>`).join('');
                right += `<div class="add-part-btn" onclick="addMinistryPart('${thursday}')">+ Add Ministry Part</div>`;
                // Auxiliary Class (mirrors ministry parts, with student & assistant pairs)
                if (hasAux) {
                    right += `<div class="meeting-colsection-header mc-auxiliary">
                        <span>Auxiliary Class — FSG <input type="text" class="pdf-editor-input" style="width:34px;display:inline-block;"
                            value="${getMeetingField(thursday, 'auxiliaryFSG', '')}" onchange="updateMeetingField('${thursday}', 'auxiliaryFSG', this.value)"></span>
                        <span>${auxiliaryClass || EM}</span>
                    </div>`;
                    right += ministryParts.map((part, i) => `
                        <div class="meeting-part">
                            <span class="meeting-part-number ministry">${4 + i}.</span>
                            <span class="meeting-part-title" style="color:#a16207;">${part.title ? escNewlines(part.title) : '<em style=\"color:#999;\">—</em>'}</span>
                            <span class="meeting-part-name meeting-part-pair">
                                <input type="text" class="pdf-editor-name" style="min-width:70px;" value="${getMeetingField(thursday, 'auxStudent' + i, '')}"
                                    onchange="updateMeetingField('${thursday}', 'auxStudent${i}', this.value)" placeholder="Student">
                                <span class="amp">&</span>
                                <input type="text" class="pdf-editor-name" style="min-width:70px;" value="${getMeetingField(thursday, 'auxAssistant' + i, '')}"
                                    onchange="updateMeetingField('${thursday}', 'auxAssistant${i}', this.value)" placeholder="Assistant">
                            </span>
                        </div>`).join('');
                }

                // ---- ASSEMBLE WEEK ----
                html += `
                <div class="meeting-week meeting-schedule">
                    <div class="meeting-weekbar">
                        <span>${dateRange}</span>
                        <input type="text" class="pdf-editor-input scripture" style="width:150px;"
                            value="${getMeetingField(thursday, 'bibleReading', '')}"
                            onchange="updateMeetingField('${thursday}', 'bibleReading', this.value)" placeholder="JEREMIAS 45-46">
                    </div>
                    <div class="meeting-chairman-row">
                        <span>Awit <input type="text" class="pdf-editor-input" style="width:34px;display:inline-block;"
                            value="${getMeetingField(thursday, 'openingSong', '')}" onchange="updateMeetingField('${thursday}', 'openingSong', this.value)"></span>
                        <span>Chairman: <strong>${chairman || EM}</strong></span>
                        <span>Panalangin: <strong>${openingPrayer || EM}</strong></span>
                    </div>
                    <div class="meeting-2col">
                        <div class="meeting-col">${left}</div>
                        <div class="meeting-col">${right}</div>
                    </div>
                    <div class="meeting-footer">
                        <span>Awit <input type="text" class="pdf-editor-input" style="width:34px;display:inline-block;"
                            value="${getMeetingField(thursday, 'closingSong', '')}" onchange="updateMeetingField('${thursday}', 'closingSong', this.value)">
                            &nbsp; Pangwakas na Komento ng Chairman <span class="meeting-part-minutes">(3 min.)</span></span>
                        <span>Panalangin: <strong>${closingPrayer || EM}</strong></span>
                    </div>
                </div>`;
            });

            container.innerHTML = html;
            container.querySelectorAll('textarea.pdf-editor-input').forEach(autoResizeTextarea);
        }
        // ==================== WORKBOOK IMPORT (EPUB) ====================
        const WB_MONTHS_TG = { 'ENERO':1,'PEBRERO':2,'MARSO':3,'ABRIL':4,'MAYO':5,'HUNYO':6,'HULYO':7,
            'AGOSTO':8,'SETYEMBRE':9,'SEPTYEMBRE':9,'OKTUBRE':10,'NOBYEMBRE':11,'DISYEMBRE':12 };

        function wbStripTags(s) { return (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }

        function wbCleanTitle(t) {
            return (t || '').replace(/^\d+\.\s*/, '').replace(/\s*\(\d+\s*min\.?\)\s*/i, '').trim();
        }

        function wbTitleWithMin(rawTitle, minutes) {
            const base = wbCleanTitle(rawTitle);
            return minutes ? `${base} (${minutes} min.)` : base;
        }

        function wbWeekToThursday(label) {
            const up = (label || '').toUpperCase();
            const m = up.match(/([A-ZÑ]+)\s+(\d+)/);
            if (!m) return null;
            const month = WB_MONTHS_TG[m[1]];
            const day = parseInt(m[2], 10);
            let year = 2026;
            const ym = up.match(/(\d{4})/);
            if (ym) year = parseInt(ym[1], 10);
            if (!month) return null;
            const monday = new Date(`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T12:00:00+08:00`);
            const thu = new Date(monday.getTime() + 3 * 86400000);
            return `${thu.getFullYear()}-${String(thu.getMonth()+1).padStart(2,'0')}-${String(thu.getDate()).padStart(2,'0')}`;
        }

        function wbParseWeek(html) {
            const h1 = html.match(/<h1[^>]*>(.*?)<\/h1>/s);
            const weekLabel = h1 ? wbStripTags(h1[1]) : '';
            const h2 = html.match(/<h2[^>]*>.*?<strong><a[^>]*>(.*?)<\/a><\/strong>/s);
            const bible = h2 ? wbStripTags(h2[1]) : '';
            const songs = [...html.matchAll(/Awit Blg\.\s*(\d+)/g)].map(m => m[1]);
            const wheatI = html.indexOf('dc-icon--wheat');
            const sheepI = html.indexOf('dc-icon--sheep');
            const parts = [];
            for (const mm of html.matchAll(/<h3[^>]*data-pid="(\d+)"[^>]*>(.*?)<\/h3>/gs)) {
                const pos = mm.index;
                const title = wbStripTags(mm[2]);
                const after = html.slice(mm.index + mm[0].length, mm.index + mm[0].length + 300);
                const mIn = title.match(/\((\d+)\s*min\.?\)/);
                const mAf = after.match(/\((\d+)\s*min\.?\)/);
                const minutes = mIn ? mIn[1] : (mAf ? mAf[1] : '');
                const sec = pos < wheatI ? 'kayaman' : (pos < sheepI ? 'ministry' : 'living');
                parts.push({ title, minutes, sec });
            }
            return { weekLabel, bible, songs, parts };
        }

        async function handleWorkbookImport(event) {
            const file = event.target.files[0];
            if (!file) return;
            event.target.value = '';
            if (typeof JSZip === 'undefined') { alert('ZIP library not loaded. Refresh the page and try again.'); return; }
            try {
                const zip = await JSZip.loadAsync(file);
                const weekly = Object.keys(zip.files)
                    .filter(n => /OEBPS\/\d{9}\.xhtml$/.test(n) && !n.includes('extracted') && !n.endsWith('400.xhtml'))
                    .sort();
                const weeks = [];
                for (const name of weekly) {
                    const content = await zip.files[name].async('string');
                    const d = wbParseWeek(content);
                    const thu = wbWeekToThursday(d.weekLabel);
                    if (!thu) continue;
                    const kayaman = d.parts.filter(p => p.sec === 'kayaman');
                    const part1 = kayaman.find(p => /^1\./.test(p.title));
                    const ministry = d.parts.filter(p => p.sec === 'ministry');
                    const living = d.parts.filter(p => p.sec === 'living' && /^\d+\./.test(p.title) && !/Pag-aaral ng Kongregasyon/i.test(p.title));
                    weeks.push({
                        thursday: thu,
                        weekLabel: d.weekLabel,
                        bibleReading: d.bible,
                        openingSong: d.songs[0] || '',
                        middleSong: d.songs[1] || '',
                        closingSong: d.songs[2] || '',
                        part1Title: part1 ? wbTitleWithMin(part1.title, part1.minutes) : '',
                        ministryParts: ministry.map(p => ({ title: wbTitleWithMin(p.title, p.minutes), name: '', assistant: '' })),
                        pamumuhayTitles: living.map(p => wbTitleWithMin(p.title, p.minutes))
                    });
                }
                if (weeks.length === 0) { alert('Walang nakitang lingguhang schedule sa EPUB na ito.'); return; }
                workbookPreview = weeks;
                renderWorkbookPreview();
                document.getElementById('workbookModal').classList.remove('hidden');
                document.body.classList.add('modal-open');
            } catch (e) {
                alert('Error reading workbook: ' + e.message);
            }
        }

        function renderWorkbookPreview() {
            const container = document.getElementById('workbookContent');
            const summary = document.getElementById('workbookSummary');
            const weeks = workbookPreview || [];
            if (summary) summary.textContent = `${weeks.length} week(s) found — ${weeks[0].thursday} to ${weeks[weeks.length-1].thursday}. Only empty fields will be filled (manual entries preserved).`;
            let html = '';
            weeks.forEach(w => {
                html += `<div class="mb-3 border border-gray-200 rounded-lg p-3">
                    <div class="font-bold text-gray-900">${w.weekLabel} <span class="text-xs text-gray-500">(${w.thursday})</span></div>
                    <div class="text-xs text-gray-600 mb-1">${w.bibleReading} &bull; Awit ${w.openingSong}/${w.middleSong}/${w.closingSong}</div>
                    <div class="text-sm text-gray-800">1. ${w.part1Title}</div>
                    ${w.ministryParts.map(p => `<div class="text-sm text-gray-700" style="padding-left:10px;">- ${p.title}</div>`).join('')}
                    ${w.pamumuhayTitles.map(t => `<div class="text-sm text-gray-700" style="padding-left:10px;">- ${t}</div>`).join('')}
                </div>`;
            });
            container.innerHTML = html;
        }

        function applyWorkbookImport() {
            const weeks = workbookPreview || [];
            if (weeks.length === 0) { closeWorkbookModal(); return; }
            loadMeetingEditorData();
            weeks.forEach(w => {
                const key = getMeetingEditorKey(w.thursday);
                if (!meetingEditorData[key]) meetingEditorData[key] = {};
                const md = meetingEditorData[key];
                const setIfEmpty = (field, val) => {
                    if (val && (md[field] === undefined || md[field] === '' || md[field] === null)) md[field] = val;
                };
                setIfEmpty('bibleReading', w.bibleReading);
                setIfEmpty('openingSong', w.openingSong);
                setIfEmpty('middleSong', w.middleSong);
                setIfEmpty('closingSong', w.closingSong);
                setIfEmpty('part1Title', w.part1Title);
                if ((!md.ministryParts || md.ministryParts.length === 0) && w.ministryParts.length > 0) {
                    md.ministryParts = w.ministryParts.map(p => ({ title: p.title, name: '', assistant: '' }));
                }
                w.pamumuhayTitles.forEach((t, i) => {
                    const f = 'pamumuhayTitle' + i;
                    if (t && (md[f] === undefined || md[f] === '' || md[f] === 'Pamumuhay')) md[f] = t;
                });
            });
            saveMeetingEditorData();
            workbookPreview = null;
            closeWorkbookModal();
            if (currentView === 'pdfEditor') renderPdfEditor();
            alert(`Workbook imported! Pinunan ang mga field para sa ${weeks.length} linggo. Ang mga pangalan ay mula pa rin sa Assignments tab.`);
        }

        function closeWorkbookModal() {
            document.getElementById('workbookModal').classList.add('hidden');
            document.body.classList.remove('modal-open');
        }

        async function exportMeetingPDF() {
            const { jsPDF } = window.jspdf;
            if (!jsPDF) { alert('PDF library not loaded. Please refresh the page.'); return; }

            const monthStr = document.getElementById('monthSelect').value;
            const [year, month] = monthStr.split('-').map(Number);
            const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const thursdays = getThursdaysForMonthByWeekStart(year, month);

            const doc = new jsPDF('portrait', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 8;
            const contentWidth = pageWidth - margin * 2;
            const pageHeaderH = 16;         // top congregation header
            const gapBetweenWeeks = 5;
            const weeksPerPage = 2;

            function drawPageHeader(monthLabel) {
                // Left: congregation + subtitle. Right: month.
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(15);
                doc.setTextColor(17, 24, 39);
                doc.text('UP VILLAGE CONGREGATION', margin, 8);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                doc.setTextColor(90, 90, 90);
                doc.text('Midweek Meeting Schedule', margin, 13);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(13);
                doc.setTextColor(17, 24, 39);
                doc.text(monthLabel, pageWidth - margin, 10, { align: 'right' });
                // divider line
                doc.setDrawColor(120, 30, 45);
                doc.setLineWidth(0.6);
                doc.line(margin, pageHeaderH - 1, pageWidth - margin, pageHeaderH - 1);
                doc.setLineWidth(0.2);
            }

            const monthLabel = `${monthNames[month]} ${year}`;
            const weekAreaH = (pageHeight - pageHeaderH - margin - gapBetweenWeeks) / weeksPerPage;

            thursdays.forEach((thursday, idx) => {
                const posInPage = idx % weeksPerPage;
                if (posInPage === 0) {
                    if (idx > 0) doc.addPage();
                    drawPageHeader(monthLabel);
                }
                const x = margin;
                const y = pageHeaderH + posInPage * (weekAreaH + gapBetweenWeeks);
                drawMeetingWeek(doc, thursday, x, y, contentWidth, weekAreaH);
            });

            const pdfBlob = doc.output('blob');
            const wherePdf = await saveToBackups(`OCLM-${monthNames[month]}-${year}.pdf`, pdfBlob);
            if (wherePdf === 'folder') alert('PDF saved to your backups folder!');
        }

        function drawMeetingWeek(doc, thursday, x, y, width, height) {
            const thursdayDate = new Date(thursday + 'T12:00:00+08:00');
            const weekStart = new Date(thursdayDate); weekStart.setDate(thursdayDate.getDate() - 3);
            const weekEnd = new Date(thursdayDate); weekEnd.setDate(thursdayDate.getDate() + 3);
            const mS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const sD = weekStart.getDate(), eD = weekEnd.getDate();
            const sM = weekStart.getMonth() + 1, eM = weekEnd.getMonth() + 1;
            const dateRange = sM === eM ? `${mS[sM]} ${sD} - ${eD}` : `${mS[sM]} ${sD} - ${mS[eM]} ${eD}`;

            // ---- data ----
            const EM = '—';
            const openingPrayer = getAssignedBrother(thursday, 'Opening Prayer') || EM;
            const chairman = getAssignedBrother(thursday, 'OCLM Chairman') || EM;
            const tenMinTalk = getAssignedBrother(thursday, '10 mins talk') || EM;
            const espirituwalHiyas = getAssignedBrother(thursday, 'Espiritual na Hiyas') || EM;
            const auxiliaryClass = getAssignedBrother(thursday, 'Auxiliary Class Chairman') || EM;
            const cbs = getAssignedBrother(thursday, 'CBS') || EM;
            const cbsReader = getAssignedBrother(thursday, 'CBS Reader') || EM;
            const closingPrayer = getAssignedBrother(thursday, 'Closing prayer') || EM;
            const bibleReading = getMeetingField(thursday, 'bibleReading', '');
            const openingSong = getMeetingField(thursday, 'openingSong', '');
            const part1Title = getMeetingField(thursday, 'part1Title', '');
            const bibleReadingName = getMeetingField(thursday, 'bibleReadingName', '') || EM;
            const middleSong = getMeetingField(thursday, 'middleSong', '');
            const closingSong = getMeetingField(thursday, 'closingSong', '');
            const auxiliaryFSG = getMeetingField(thursday, 'auxiliaryFSG', '');
            const ministryParts = meetingEditorData[getMeetingEditorKey(thursday)]?.ministryParts || [];
            const livingParts = meetingEditorData[getMeetingEditorKey(thursday)]?.livingParts || [];
            const pamumuhayBrothers = getAssignedBrothers(thursday, 'Pamumuhay');
            const hasAux = (new Date(thursday + 'T12:00:00+08:00').getMonth() + 1) >= AUXILIARY_START_MONTH;

            // ---- geometry ----
            const weekBarH = 6;
            const chairRowH = 5.5;
            const colGap = 4;
            const colX = [x, x + width / 2 + colGap / 2];
            const colW = width / 2 - colGap / 2;
            const bodyTop = y + weekBarH + chairRowH;
            const bodyH = height - weekBarH - chairRowH - 12; // reserve top space (5) + footer (7)

            // name+assistant joiner
            function pairName(name, assistant) {
                if (name && assistant) return `${name} & ${assistant}`;
                return name || EM;
            }

            // wrap helper to a given width
            function wrap(text, fs, w) {
                doc.setFontSize(fs);
                const segs = (text || '').split('\n');
                let out = [];
                segs.forEach(s => { out = out.concat(doc.splitTextToSize(s === '' ? ' ' : s, w)); });
                return out.length ? out : [''];
            }

            // Build row model for a column so we can auto-fit font to available height.
            // Each row: {num, title, minutes, name, color:[r,g,b], titleColor:[r,g,b], indent}
            const TEAL = [13, 148, 136], GOLD = [161, 98, 7], RED = [185, 28, 28], DARK = [17, 24, 39];

            // LEFT column rows: Kayamanan (3) + Awit + Pamumuhay header + pamumuhay + living + CBS + reader
            const leftRows = [];
            leftRows.push({ kind: 'section', label: 'KAYAMANAN MULA SA SALITA NG DIYOS', icon: 'diamond', color: TEAL });
            leftRows.push({ kind: 'part', num: '1.', title: part1Title || '(10 min.)', name: tenMinTalk, numColor: TEAL, titleColor: TEAL });
            leftRows.push({ kind: 'part', num: '2.', title: 'Espirituwal na Hiyas (10 min.)', name: espirituwalHiyas, numColor: TEAL, titleColor: TEAL });
            leftRows.push({ kind: 'part', num: '3.', title: 'Pagbabasa ng Bibliya (4 min.)', name: bibleReadingName, numColor: TEAL, titleColor: TEAL });
            leftRows.push({ kind: 'awit', label: `Awit ${openingSong || ''}` });
            leftRows.push({ kind: 'section', label: 'PAMUMUHAY BILANG KRISTIYANO', icon: 'sheep', color: RED });
            const pamStart = 4 + ministryParts.length;
            if (pamumuhayBrothers.length > 0) {
                pamumuhayBrothers.forEach((bn, i) => {
                    leftRows.push({ kind: 'part', num: `${pamStart + i}.`, title: getMeetingField(thursday, 'pamumuhayTitle' + i, 'Pamumuhay'), name: bn || EM, numColor: RED, titleColor: DARK });
                });
            } else {
                leftRows.push({ kind: 'part', num: `${pamStart}.`, title: getMeetingField(thursday, 'pamumuhayTitle0', 'Pamumuhay'), name: EM, numColor: RED, titleColor: DARK });
            }
            const livingStart = pamStart + Math.max(pamumuhayBrothers.length, 1);
            livingParts.forEach((p, i) => {
                leftRows.push({ kind: 'part', num: `${livingStart + i}.`, title: p.title || '', name: p.name || EM, numColor: RED, titleColor: DARK });
            });
            const cbsNum = livingStart + livingParts.length;
            leftRows.push({ kind: 'part', num: `${cbsNum}.`, title: 'Pag-aaral ng Kongregasyon sa Bibliya (30 min.)', name: cbs, numColor: RED, titleColor: DARK });
            leftRows.push({ kind: 'inline', label: 'Par. Reader:', name: cbsReader, color: DARK });

            // RIGHT column rows: Maging Mahusay + ministry + (Auxiliary bar + aux parts)
            const rightRows = [];
            rightRows.push({ kind: 'section', label: 'MAGING MAHUSAY SA MINISTERYO', icon: 'grain', color: GOLD });
            ministryParts.forEach((p, i) => {
                rightRows.push({ kind: 'part', num: `${4 + i}.`, title: p.title || '', name: pairName(p.name, p.assistant), numColor: GOLD, titleColor: GOLD });
            });
            if (hasAux) {
                rightRows.push({ kind: 'auxbar', label: `Auxiliary Class-FSG ${auxiliaryFSG || ''}`.trim(), name: auxiliaryClass });
                ministryParts.forEach((p, i) => {
                    const stu = getMeetingField(thursday, 'auxStudent' + i, '');
                    const asi = getMeetingField(thursday, 'auxAssistant' + i, '');
                    rightRows.push({ kind: 'part', num: `${4 + i}.`, title: p.title || EM, name: pairName(stu, asi), numColor: GOLD, titleColor: GOLD });
                });
            }

            // Auto-fit: find a font size so the taller column fits bodyH.
            // Each part row = title lines (wrapped) + a name line beneath (JW style: name under title).
            function columnHeight(rows, fs, w) {
                const lh = fs * 0.50;                 // mm per line at this font (approx)
                let h = 0;
                rows.forEach(r => {
                    if (r.kind === 'section') h += fs * 0.62 + 2.5;
                    else if (r.kind === 'auxbar') h += fs * 0.62 + 2.5;
                    else if (r.kind === 'awit') h += lh + 2;
                    else {
                        const titleLines = wrap((r.num ? r.num + ' ' : '') + r.title, fs, w - 2).length;
                        h += titleLines * lh + lh + 2.4;  // title lines + name line + padding
                    }
                });
                return h;
            }
            let fontPt = 12;
            for (let pass = 0; pass < 6; pass++) {
                const lh = columnHeight(leftRows, fontPt, colW);
                const rh = columnHeight(rightRows, fontPt, colW);
                const tallest = Math.max(lh, rh);
                if (tallest <= bodyH || fontPt <= 8) break;
                fontPt -= 0.5;
            }
            const LH = fontPt * 0.52;

            // ---- draw week bar (maroon) ----
            doc.setFillColor(120, 30, 45);
            doc.rect(x, y, width, weekBarH, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(255, 255, 255);
            doc.text(dateRange, x + 2, y + weekBarH - 1.8);
            doc.text((bibleReading || '').toUpperCase(), x + width - 2, y + weekBarH - 1.8, { align: 'right' });

            // ---- chairman row ----
            doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(30, 30, 30);
            doc.text(`Awit ${openingSong || ''}`, x + 2, y + weekBarH + chairRowH - 1.8);
            doc.setFont('helvetica', 'normal');
            doc.text(`Chairman: ${chairman}`, x + width * 0.32, y + weekBarH + chairRowH - 1.8);
            doc.text(`Panalangin: ${openingPrayer}`, x + width - 2, y + weekBarH + chairRowH - 1.8, { align: 'right' });
            doc.setDrawColor(210, 210, 210); doc.line(x, bodyTop, x + width, bodyTop);
            // vertical divider between the two columns
            doc.setDrawColor(225, 225, 225);
            doc.line(x + width / 2, bodyTop, x + width / 2, y + height);

            // ---- column renderer ----
            function renderColumn(rows, cx) {
                let cy = bodyTop + 5;
                rows.forEach(r => {
                    if (r.kind === 'section') {
                        // icon + colored text, NO filled bar
                        const iconSz = fontPt * 0.5;
                        try { if (ICON_B64[r.icon]) doc.addImage(ICON_B64[r.icon], 'PNG', cx, cy - iconSz + 1, iconSz, iconSz); } catch(e){}
                        doc.setFont('helvetica', 'bold'); doc.setFontSize(fontPt * 1.05);
                        doc.setTextColor(r.color[0], r.color[1], r.color[2]);
                        doc.text(r.label, cx + iconSz + 1.5, cy);
                        cy += fontPt * 0.62 + 2.5;
                    } else if (r.kind === 'auxbar') {
                        // ONLY section with a solid colored bar (green), white text, conductor on right
                        const barH = fontPt * 0.62 + 2.5;
                        doc.setFillColor(5, 150, 105);
                        doc.rect(cx, cy - fontPt * 0.42, colW, barH, 'F');
                        doc.setFont('helvetica', 'bold'); doc.setFontSize(fontPt * 0.95);
                        doc.setTextColor(255, 255, 255);
                        doc.text(r.label, cx + 1.5, cy);
                        doc.text(r.name || EM, cx + colW - 1.5, cy, { align: 'right' });
                        cy += barH;
                    } else if (r.kind === 'awit') {
                        doc.setFont('helvetica', 'bold'); doc.setFontSize(fontPt * 0.95);
                        doc.setTextColor(60, 60, 60);
                        doc.text(r.label, cx, cy);
                        cy += LH + 2;
                    } else if (r.kind === 'inline') {
                        doc.setFont('helvetica', 'bold'); doc.setFontSize(fontPt);
                        doc.setTextColor(r.color[0], r.color[1], r.color[2]);
                        doc.text(`${r.label} ${r.name || EM}`, cx, cy);
                        cy += LH + 2.4;
                    } else {
                        // part: number+title (colored) then name beneath in dark bold
                        doc.setFont('helvetica', 'bold'); doc.setFontSize(fontPt);
                        const prefix = r.num ? r.num + ' ' : '';
                        const titleLines = wrap(prefix + r.title, fontPt, colW - (r.indent ? 6 : 2));
                        doc.setTextColor(r.titleColor[0], r.titleColor[1], r.titleColor[2]);
                        titleLines.forEach((ln, li) => {
                            doc.text(ln, cx + (r.indent ? 6 : 0), cy);
                            cy += LH;
                        });
                        // name line
                        doc.setFont('helvetica', 'normal'); doc.setFontSize(fontPt * 0.95);
                        doc.setTextColor(20, 20, 20);
                        doc.text(r.name || EM, cx + 4, cy);
                        cy += LH + 2.4;
                    }
                });
            }

            renderColumn(leftRows, colX[0]);
            renderColumn(rightRows, colX[1]);

            // ---- footer (Awit + closing prayer) ----
            doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5);
            doc.setTextColor(60, 60, 60);
            doc.text(`Awit ${closingSong || ''}`, x + 2, y + height - 1.5);
            doc.setTextColor(20, 20, 20);
            doc.text(`Panalangin: ${closingPrayer}`, x + width - 2, y + height - 1.5, { align: 'right' });
        }

        // Initialize on load
        init();
